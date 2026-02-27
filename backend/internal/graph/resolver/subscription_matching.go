package resolver

import (
	"context"
	"log"
	"math"
	"sort"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"go2fix-backend/internal/auth"
	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph/model"
	"go2fix-backend/internal/service/matching"
)

// suggestWorkersForSubscription finds and ranks available workers for a recurring subscription.
// It evaluates each candidate across multiple future occurrence dates, scoring them by
// consistency (how many weeks they can cover) plus the standard match score.
func (r *Resolver) suggestWorkersForSubscription(
	ctx context.Context,
	areaID pgtype.UUID,
	categoryID pgtype.UUID,
	recurrenceType db.RecurrenceType,
	dayOfWeek int,
	preferredTimeStart string,
	preferredTimeEnd string,
	estimatedDurationHours float64,
) ([]*model.SubscriptionWorkerSuggestion, error) {
	config := loadMatchConfig(ctx, r.Queries)
	jobDurationMicros := int64(math.Ceil(estimatedDurationHours * float64(matching.HourMicros)))
	clientStart := matching.HHMMToMicros(preferredTimeStart)
	clientEnd := matching.HHMMToMicros(preferredTimeEnd)

	// Get client user ID for affinity computation (empty string if unauthenticated).
	clientUserID := ""
	if claims := auth.GetUserFromContext(ctx); claims != nil {
		clientUserID = claims.UserID
	}

	// 1. Find all active workers in the area (optionally filtered by category).
	var workers []db.FindMatchingWorkersRow
	var err error
	if categoryID.Valid {
		catRows, catErr := r.Queries.FindMatchingWorkersByCategory(ctx, db.FindMatchingWorkersByCategoryParams{
			AreaID:     areaID,
			CategoryID: categoryID,
		})
		if catErr != nil {
			return nil, catErr
		}
		for _, cr := range catRows {
			workers = append(workers, db.FindMatchingWorkersRow{
				ID:                 cr.ID,
				UserID:             cr.UserID,
				FullName:           cr.FullName,
				AvatarUrl:          cr.AvatarUrl,
				RatingAvg:          cr.RatingAvg,
				TotalJobsCompleted: cr.TotalJobsCompleted,
				CompanyName:        cr.CompanyName,
				CompanyID:          cr.CompanyID,
			})
		}
	} else {
		workers, err = r.Queries.FindMatchingWorkers(ctx, areaID)
		if err != nil {
			return nil, err
		}
	}
	if len(workers) == 0 {
		return []*model.SubscriptionWorkerSuggestion{}, nil
	}

	// 2. Generate future occurrence dates (~8 weeks ahead).
	occurrences := generateSubscriptionDates(recurrenceType, dayOfWeek, 8)
	totalWeeks := len(occurrences)
	if totalWeeks == 0 {
		return []*model.SubscriptionWorkerSuggestion{}, nil
	}

	// 3. Evaluate each candidate worker.
	type scored struct {
		suggestion *model.SubscriptionWorkerSuggestion
		score      float64
	}
	var results []scored

	maxCandidates := 20
	if len(workers) < maxCandidates {
		maxCandidates = len(workers)
	}

	for _, w := range workers[:maxCandidates] {
		suggestion := r.evaluateWorkerForSubscription(
			ctx, w, occurrences, clientStart, clientEnd, jobDurationMicros, config, clientUserID,
		)
		if suggestion != nil {
			results = append(results, scored{suggestion: suggestion, score: suggestion.MatchScore})
		}
	}

	// 4. Sort by score descending.
	sort.Slice(results, func(i, j int) bool {
		return results[i].score > results[j].score
	})

	maxResults := 5
	if len(results) < maxResults {
		maxResults = len(results)
	}

	suggestions := make([]*model.SubscriptionWorkerSuggestion, 0, maxResults)
	for _, r := range results[:maxResults] {
		if r.score > 20 {
			suggestions = append(suggestions, r.suggestion)
		}
	}

	return suggestions, nil
}

// generateSubscriptionDates generates the next N occurrence dates for a subscription
// starting from today, on the specified day of week.
func generateSubscriptionDates(recType db.RecurrenceType, dayOfWeek int, count int) []time.Time {
	now := time.Now()

	// Find the next occurrence of the target day of week.
	// dayOfWeek: 1=Monday ... 7=Sunday (from frontend), convert to Go's time.Weekday.
	targetWeekday := time.Weekday(dayOfWeek % 7) // 1->Mon, 2->Tue, ..., 7->Sun->0
	daysUntil := int(targetWeekday) - int(now.Weekday())
	if daysUntil <= 0 {
		daysUntil += 7
	}
	firstDate := now.AddDate(0, 0, daysUntil)

	dates := make([]time.Time, 0, count)
	current := firstDate
	for i := 0; i < count; i++ {
		dates = append(dates, current)
		switch recType {
		case db.RecurrenceTypeWeekly:
			current = current.AddDate(0, 0, 7)
		case db.RecurrenceTypeBiweekly:
			current = current.AddDate(0, 0, 14)
		case db.RecurrenceTypeMonthly:
			current = current.AddDate(0, 1, 0)
		}
	}

	return dates
}

// evaluateWorkerForSubscription assesses a single worker's availability across
// multiple recurring dates and returns a SubscriptionWorkerSuggestion.
func (r *Resolver) evaluateWorkerForSubscription(
	ctx context.Context,
	w db.FindMatchingWorkersRow,
	occurrences []time.Time,
	clientStartMicros, clientEndMicros int64,
	jobDurationMicros int64,
	config matching.MatchConfig,
	clientUserID string,
) *model.SubscriptionWorkerSuggestion {
	// Load weekly availability.
	avail, err := r.Queries.ListWorkerAvailability(ctx, w.ID)
	if err != nil {
		log.Printf("suggestWorkersForSubscription: failed to load availability for worker %s: %v", uuidToString(w.ID), err)
		return nil
	}

	availByDay := map[int]db.WorkerAvailability{}
	for _, a := range avail {
		if a.IsAvailable.Valid && a.IsAvailable.Bool {
			availByDay[int(a.DayOfWeek)] = a
		}
	}

	// Fallback: if no availability records configured, assume default working hours (08:00-20:00) on weekdays.
	if len(availByDay) == 0 {
		defaultStart := matching.HHMMToMicros("08:00")
		defaultEnd := matching.HHMMToMicros("20:00")
		for dow := 1; dow <= 5; dow++ { // Monday=1 through Friday=5
			availByDay[dow] = db.WorkerAvailability{
				DayOfWeek:   int32(dow),
				IsAvailable: pgtype.Bool{Bool: true, Valid: true},
				StartTime:   pgtype.Time{Microseconds: defaultStart, Valid: true},
				EndTime:     pgtype.Time{Microseconds: defaultEnd, Valid: true},
			}
		}
	}

	// Check availability for each occurrence date.
	totalWeeks := len(occurrences)
	availableWeeks := 0
	var bestStartHHMM, bestEndHHMM string

	for _, date := range occurrences {
		dow := int(date.Weekday())

		// Check if worker has availability on this day of week.
		dayAvail, ok := availByDay[dow]
		if !ok {
			continue
		}

		availStart := dayAvail.StartTime.Microseconds
		availEnd := dayAvail.EndTime.Microseconds

		// Check for date overrides.
		overrides, _ := r.Queries.ListWorkerDateOverrides(ctx, db.ListWorkerDateOverridesParams{
			WorkerID:       w.ID,
			OverrideDate:   pgtype.Date{Time: date, Valid: true},
			OverrideDate_2: pgtype.Date{Time: date, Valid: true},
		})
		if len(overrides) > 0 {
			if !overrides[0].IsAvailable {
				continue // worker marked as off on this date
			}
			availStart = overrides[0].StartTime.Microseconds
			availEnd = overrides[0].EndTime.Microseconds
		}

		// Load existing bookings for this date.
		bookings, err := r.Queries.ListWorkerBookingsForDate(ctx, db.ListWorkerBookingsForDateParams{
			WorkerID:      w.ID,
			ScheduledDate: pgtype.Date{Time: date, Valid: true},
		})
		if err != nil {
			continue
		}

		if config.MaxJobsPerDay > 0 && len(bookings) >= config.MaxJobsPerDay {
			continue
		}

		var existingBookings []matching.BookingSlot
		for _, b := range bookings {
			startMicros := b.ScheduledStartTime.Microseconds
			durationHours := numericToFloat(b.EstimatedDurationHours)
			endMicros := startMicros + int64(durationHours*float64(matching.HourMicros))
			existingBookings = append(existingBookings, matching.BookingSlot{
				StartMicros: startMicros,
				EndMicros:   endMicros,
			})
		}

		freeIntervals := matching.ComputeFreeIntervals(availStart, availEnd, existingBookings, config.BufferMicros())

		// Try placement within the client's requested time window.
		clientSlot := []matching.TimeSlot{{StartMicros: clientStartMicros, EndMicros: clientEndMicros}}
		placement := matching.FindOptimalPlacement(freeIntervals, clientSlot, jobDurationMicros)

		if !placement.Found {
			// Try anywhere in the day.
			fullDaySlot := []matching.TimeSlot{{StartMicros: availStart, EndMicros: availEnd}}
			placement = matching.FindOptimalPlacement(freeIntervals, fullDaySlot, jobDurationMicros)
		}

		if placement.Found {
			availableWeeks++
			if bestStartHHMM == "" {
				bestStartHHMM = matching.MicrosToHHMM(placement.StartMicros)
				bestEndHHMM = matching.MicrosToHHMM(placement.EndMicros)
			}
		}
	}

	// Skip workers with no availability at all.
	if availableWeeks == 0 {
		return nil
	}

	consistencyPct := float64(availableWeeks) / float64(totalWeeks) * 100.0

	// Compute dynamic rating.
	dynamicRating := numericToFloat(w.RatingAvg)
	if avg, err := r.Queries.GetAverageWorkerRating(ctx, w.ID); err == nil {
		dynamicRating = numericToFloat(avg)
	}
	dynamicCompleted := int4Val(w.TotalJobsCompleted)
	if count, err := r.Queries.CountCompletedJobsByWorker(ctx, w.ID); err == nil {
		dynamicCompleted = int(count)
	}

	// Compute weekly booking count for hunger bonus.
	weekStart := time.Now().AddDate(0, 0, -int(time.Now().Weekday()))
	weekEnd := weekStart.AddDate(0, 0, 6)
	weekCount := 0
	if cnt, err := r.Queries.CountWorkerBookingsInDateRange(ctx, db.CountWorkerBookingsInDateRangeParams{
		WorkerID:      w.ID,
		ScheduledDate: pgtype.Date{Time: weekStart, Valid: true},
		ScheduledDate_2: pgtype.Date{Time: weekEnd, Valid: true},
	}); err == nil {
		weekCount = int(cnt)
	}

	// Compute sub-rating bonus (punctuality + quality).
	var subRatingBonus float64
	if subs, err := r.Queries.GetWorkerSubRatings(ctx, w.ID); err == nil {
		subRatingBonus = computeSubRatingBonus(subs.AvgPunctuality, subs.AvgQuality, subs.RatedCount)
	}

	// Compute personality bonus from integrity score.
	var personalityBonus float64
	if pa, err := r.Queries.GetPersonalityAssessmentByWorkerID(ctx, w.ID); err == nil {
		personalityBonus = computePersonalityBonus(numericToFloat(pa.IntegrityAvg), true)
	}

	// Compute client affinity bonus.
	var affinityScore float64
	if clientUserID != "" {
		if history, err := r.Queries.GetClientWorkerHistory(ctx, db.GetClientWorkerHistoryParams{
			ClientUserID: stringToUUID(clientUserID),
			WorkerID:     w.ID,
		}); err == nil {
			affinityScore = computeClientAffinityScore(history.TotalJobs, history.AvgRating, config.AffinityBonus)
		}
	}

	hungerBonus := computeWorkerHungerBonus(weekCount, config)

	// Score = standard match score + consistency bonus (up to +30 points).
	baseScore := matching.ComputeMatchScore(matching.ScoreInput{
		RatingAvg:           dynamicRating,
		TotalJobsDone:       dynamicCompleted,
		IsAreaMatch:         true,
		PlacementFound:      true,
		GapScoreH:           0,
		WeekBookingCount:    weekCount,
		SubRatingBonus:      subRatingBonus,
		PersonalityBonus:    personalityBonus,
		ClientAffinityScore: affinityScore,
		WorkerHungerBonus:   hungerBonus,
		Config:              config,
	})

	consistencyBonus := consistencyPct / 100.0 * 30.0
	score := baseScore + consistencyBonus
	if score > 100 {
		score = 100
	}

	workerID := uuidToString(w.ID)
	userID := uuidToString(w.UserID)

	return &model.SubscriptionWorkerSuggestion{
		Worker: &model.WorkerProfile{
			ID:                 workerID,
			UserID:             &userID,
			FullName:           w.FullName,
			RatingAvg:          dynamicRating,
			TotalJobsCompleted: dynamicCompleted,
			User: &model.User{
				ID:        userID,
				AvatarURL: textPtr(w.AvatarUrl),
			},
		},
		Company: &model.Company{
			ID:          uuidToString(w.CompanyID),
			CompanyName: w.CompanyName,
		},
		MatchScore:         math.Round(score*10) / 10,
		AvailableWeeks:     availableWeeks,
		TotalWeeks:         totalWeeks,
		ConsistencyPct:     math.Round(consistencyPct*10) / 10,
		SuggestedTimeStart: strPtr(bestStartHHMM),
		SuggestedTimeEnd:   strPtr(bestEndHHMM),
	}
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
