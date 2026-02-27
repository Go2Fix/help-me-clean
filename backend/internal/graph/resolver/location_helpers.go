package resolver

import (
	"context"
	"fmt"
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

// cityRow holds common fields shared by all sqlc-generated city row types.
type cityRow struct {
	ID                pgtype.UUID
	Name              string
	County            string
	IsActive          bool
	PricingMultiplier pgtype.Numeric
}

func cityRowFromEnabled(c db.EnabledCity) cityRow {
	return cityRow{ID: c.ID, Name: c.Name, County: c.County, IsActive: c.IsActive, PricingMultiplier: c.PricingMultiplier}
}
func cityRowFromCreate(c db.CreateCityRow) cityRow {
	return cityRow{ID: c.ID, Name: c.Name, County: c.County, IsActive: c.IsActive, PricingMultiplier: c.PricingMultiplier}
}
func cityRowFromUpdateActive(c db.UpdateCityActiveRow) cityRow {
	return cityRow{ID: c.ID, Name: c.Name, County: c.County, IsActive: c.IsActive, PricingMultiplier: c.PricingMultiplier}
}
func cityRowFromUpdatePricing(c db.UpdateCityPricingMultiplierRow) cityRow {
	return cityRow{ID: c.ID, Name: c.Name, County: c.County, IsActive: c.IsActive, PricingMultiplier: c.PricingMultiplier}
}
func cityRowFromListActive(c db.ListActiveCitiesRow) cityRow {
	return cityRow{ID: c.ID, Name: c.Name, County: c.County, IsActive: c.IsActive, PricingMultiplier: c.PricingMultiplier}
}
func cityRowFromListEnabled(c db.ListEnabledCitiesRow) cityRow {
	return cityRow{ID: c.ID, Name: c.Name, County: c.County, IsActive: c.IsActive, PricingMultiplier: c.PricingMultiplier}
}

// dbCityToGQL converts a cityRow to a GQL model with areas loaded.
func (r *Resolver) dbCityToGQL(ctx context.Context, c cityRow) (*model.EnabledCity, error) {
	areas, err := r.Queries.ListAreasByCity(ctx, c.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to list areas for city %s: %w", c.Name, err)
	}

	var gqlAreas []*model.CityArea
	for _, a := range areas {
		gqlAreas = append(gqlAreas, &model.CityArea{
			ID:       uuidToString(a.ID),
			Name:     a.Name,
			CityID:   uuidToString(a.CityID),
			CityName: a.CityName,
		})
	}

	return &model.EnabledCity{
		ID:                uuidToString(c.ID),
		Name:              c.Name,
		County:            c.County,
		IsActive:          c.IsActive,
		PricingMultiplier: numericToFloat(c.PricingMultiplier),
		Areas:             gqlAreas,
	}, nil
}

// workerServiceAreasWithFallback returns worker areas, falling back to company areas if none assigned.
func (r *Resolver) workerServiceAreasWithFallback(ctx context.Context, workerID pgtype.UUID) ([]*model.CityArea, error) {
	rows, err := r.Queries.ListWorkerServiceAreas(ctx, workerID)
	if err != nil {
		return nil, fmt.Errorf("failed to list worker areas: %w", err)
	}

	if len(rows) > 0 {
		result := make([]*model.CityArea, len(rows))
		for i, row := range rows {
			result[i] = &model.CityArea{
				ID:       uuidToString(row.CityAreaID),
				Name:     row.AreaName,
				CityID:   uuidToString(row.CityID),
				CityName: row.CityName,
			}
		}
		return result, nil
	}

	worker, err := r.Queries.GetWorkerByID(ctx, workerID)
	if err != nil {
		return nil, nil
	}
	companyRows, err := r.Queries.ListCompanyServiceAreas(ctx, worker.CompanyID)
	if err != nil {
		return nil, nil
	}
	result := make([]*model.CityArea, len(companyRows))
	for i, row := range companyRows {
		result[i] = &model.CityArea{
			ID:       uuidToString(row.CityAreaID),
			Name:     row.AreaName,
			CityID:   uuidToString(row.CityID),
			CityName: row.CityName,
		}
	}
	return result, nil
}

// parsedSlot holds a parsed time slot with date context.
type parsedSlot struct {
	Date      string
	DateObj   time.Time
	DayOfWeek int // time.Weekday (0=Sunday)
	StartHHMM string
	EndHHMM   string
	Index     int
}

// suggestWorkersForSlots finds and ranks available workers for the given time slots.
// When categoryID is valid, only workers qualified for that category are considered.
func (r *Resolver) suggestWorkersForSlots(
	ctx context.Context,
	areaID pgtype.UUID,
	categoryID pgtype.UUID,
	timeSlots []*model.TimeSlotInput,
	estimatedDurationHours float64,
) ([]*model.WorkerSuggestion, error) {
	config := loadMatchConfig(ctx, r.Queries)
	jobDurationMicros := int64(math.Ceil(estimatedDurationHours * float64(matching.HourMicros)))

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
		// Convert to FindMatchingWorkersRow (identical fields).
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
		return []*model.WorkerSuggestion{}, nil
	}

	// Parse time slots into structured format.
	var slots []parsedSlot
	for i, ts := range timeSlots {
		t, err := time.Parse("2006-01-02", ts.Date)
		if err != nil {
			continue
		}
		slots = append(slots, parsedSlot{
			Date:      ts.Date,
			DateObj:   t,
			DayOfWeek: int(t.Weekday()),
			StartHHMM: ts.StartTime,
			EndHHMM:   ts.EndTime,
			Index:     i,
		})
	}
	if len(slots) == 0 {
		return []*model.WorkerSuggestion{}, nil
	}

	// Build client time slots as matching types.
	clientSlots := make([]matching.TimeSlot, len(slots))
	for i, s := range slots {
		clientSlots[i] = matching.TimeSlot{
			StartMicros: matching.HHMMToMicros(s.StartHHMM),
			EndMicros:   matching.HHMMToMicros(s.EndHHMM),
		}
	}

	// Compute week range for load balancing.
	minDate := slots[0].DateObj
	maxDate := slots[0].DateObj
	for _, s := range slots[1:] {
		if s.DateObj.Before(minDate) {
			minDate = s.DateObj
		}
		if s.DateObj.After(maxDate) {
			maxDate = s.DateObj
		}
	}
	weekStart := minDate.AddDate(0, 0, -int(minDate.Weekday()))
	weekEnd := weekStart.AddDate(0, 0, 6)

	// Resolve candidate job area coordinates once (used for all worker evaluations).
	candidateLat, candidateLng, hasCandidateLocation := r.resolveCandidateCoords(ctx, areaID)

	// Get client user ID for affinity computation (empty string if unauthenticated).
	clientUserID := ""
	if claims := auth.GetUserFromContext(ctx); claims != nil {
		clientUserID = claims.UserID
	}

	// 2. Evaluate each worker candidate.
	type scoredSuggestion struct {
		suggestion *model.WorkerSuggestion
		score      float64
	}
	var results []scoredSuggestion

	maxCandidates := 20
	if len(workers) < maxCandidates {
		maxCandidates = len(workers)
	}

	for _, w := range workers[:maxCandidates] {
		suggestion := r.evaluateWorkerForSlots(ctx, w, slots, clientSlots, jobDurationMicros, weekStart, weekEnd, config, candidateLat, candidateLng, hasCandidateLocation, clientUserID)
		if suggestion != nil {
			results = append(results, scoredSuggestion{suggestion: suggestion, score: suggestion.MatchScore})
		}
	}

	// 3. Sort by score descending.
	sort.Slice(results, func(i, j int) bool {
		return results[i].score > results[j].score
	})

	maxResults := config.MaxResults
	if len(results) < maxResults {
		maxResults = len(results)
	}

	// Only return workers with a meaningful score (> 20 filters out fully unavailable).
	suggestions := make([]*model.WorkerSuggestion, 0, maxResults)
	for _, r := range results[:maxResults] {
		if r.score > 20 {
			suggestions = append(suggestions, r.suggestion)
		}
	}

	return suggestions, nil
}

// evaluateWorkerForSlots assesses a single worker's availability and returns a WorkerSuggestion.
func (r *Resolver) evaluateWorkerForSlots(
	ctx context.Context,
	w db.FindMatchingWorkersRow,
	slots []parsedSlot,
	clientSlots []matching.TimeSlot,
	jobDurationMicros int64,
	weekStart, weekEnd time.Time,
	config matching.MatchConfig,
	candidateLat, candidateLng float64,
	hasCandidateLocation bool,
	clientUserID string,
) *model.WorkerSuggestion {
	// Load weekly availability.
	avail, err := r.Queries.ListWorkerAvailability(ctx, w.ID)
	if err != nil {
		log.Printf("suggestWorkers: failed to load availability for worker %s: %v", uuidToString(w.ID), err)
		return nil
	}

	// Index availability by day_of_week.
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

	// Load date overrides for the date range.
	minDate := slots[0].DateObj
	maxDate := slots[0].DateObj
	for _, s := range slots[1:] {
		if s.DateObj.Before(minDate) {
			minDate = s.DateObj
		}
		if s.DateObj.After(maxDate) {
			maxDate = s.DateObj
		}
	}
	overrides, _ := r.Queries.ListWorkerDateOverrides(ctx, db.ListWorkerDateOverridesParams{
		WorkerID:       w.ID,
		OverrideDate:   pgtype.Date{Time: minDate, Valid: true},
		OverrideDate_2: pgtype.Date{Time: maxDate, Valid: true},
	})
	overrideByDate := map[string]db.WorkerDateOverride{}
	for _, o := range overrides {
		overrideByDate[o.OverrideDate.Time.Format("2006-01-02")] = o
	}

	// Weekly booking count for load balancing.
	weekCount, _ := r.Queries.CountWorkerBookingsInDateRange(ctx, db.CountWorkerBookingsInDateRangeParams{
		WorkerID:        w.ID,
		ScheduledDate:   pgtype.Date{Time: weekStart, Valid: true},
		ScheduledDate_2: pgtype.Date{Time: weekEnd, Valid: true},
	})

	// Try each slot to find the best placement.
	var bestPlacement *matching.PlacementResult
	var bestDate string
	var bestDayCount int
	var bestAvailStart, bestAvailEnd int64
	var bestSlotIdx int
	var bestJobLocs []matching.JobLocation

	for _, s := range slots {
		var availStart, availEnd int64
		var hasAvailability bool

		if override, ok := overrideByDate[s.Date]; ok {
			if !override.IsAvailable {
				continue
			}
			availStart = override.StartTime.Microseconds
			availEnd = override.EndTime.Microseconds
			hasAvailability = true
		} else if dayAvail, ok := availByDay[s.DayOfWeek]; ok {
			availStart = dayAvail.StartTime.Microseconds
			availEnd = dayAvail.EndTime.Microseconds
			hasAvailability = true
		}

		if !hasAvailability {
			continue
		}

		dailyRows, err := r.Queries.GetWorkerDailyJobLocations(ctx, db.GetWorkerDailyJobLocationsParams{
			WorkerID:      w.ID,
			ScheduledDate: pgtype.Date{Time: s.DateObj, Valid: true},
		})
		if err != nil {
			continue
		}

		dayCount := len(dailyRows)
		if config.MaxJobsPerDay > 0 && dayCount >= config.MaxJobsPerDay {
			continue
		}

		var jobLocs []matching.JobLocation
		for _, row := range dailyRows {
			startMicros := row.ScheduledStartTime.Microseconds
			durationHours := numericToFloat(row.EstimatedDurationHours)
			endMicros := startMicros + int64(durationHours*float64(matching.HourMicros))
			jobLocs = append(jobLocs, matching.JobLocation{
				StartMicros: startMicros,
				EndMicros:   endMicros,
				Lat:         row.Lat,
				Lng:         row.Lng,
				HasLocation: row.HasLocation.Bool,
			})
		}

		freeIntervals := matching.ComputeFreeIntervalsWithRouting(availStart, availEnd, jobLocs, config.BufferMicros(), candidateLat, candidateLng, hasCandidateLocation)

		// Try placement within the client's requested time window first.
		thisSlot := []matching.TimeSlot{clientSlots[s.Index]}
		placement := matching.FindOptimalPlacement(freeIntervals, thisSlot, jobDurationMicros)

		if !placement.Found {
			// Try placement anywhere in the day's free intervals (smart suggestion).
			fullDaySlot := []matching.TimeSlot{{StartMicros: availStart, EndMicros: availEnd}}
			placement = matching.FindOptimalPlacement(freeIntervals, fullDaySlot, jobDurationMicros)
		}

		if placement.Found && (bestPlacement == nil || placement.GapScoreH < bestPlacement.GapScoreH) {
			bestPlacement = &placement
			bestDate = s.Date
			bestDayCount = dayCount
			bestAvailStart = availStart
			bestAvailEnd = availEnd
			bestSlotIdx = s.Index
			bestJobLocs = jobLocs
		}
	}

	// Don't suggest workers who have no availability at all.
	if bestPlacement == nil || !bestPlacement.Found {
		return nil
	}

	// Route efficiency: how geographically close is the new job to existing daily jobs?
	routeScore := computeRouteEfficiencyScore(candidateLat, candidateLng, bestJobLocs)

	// Client affinity: has this worker served this client before?
	var affinityScore float64
	if clientUserID != "" {
		if history, err := r.Queries.GetClientWorkerHistory(ctx, db.GetClientWorkerHistoryParams{
			ClientUserID: stringToUUID(clientUserID),
			WorkerID:     w.ID,
		}); err == nil {
			affinityScore = computeClientAffinityScore(history.TotalJobs, history.AvgRating, config.AffinityBonus)
		}
	}

	// Sub-ratings: punctuality + quality dimension bonuses.
	var subRatingBonus float64
	if subs, err := r.Queries.GetWorkerSubRatings(ctx, w.ID); err == nil {
		subRatingBonus = computeSubRatingBonus(subs.AvgPunctuality, subs.AvgQuality, subs.RatedCount)
	}

	// Personality integrity bonus.
	var personalityBonus float64
	if pa, err := r.Queries.GetPersonalityAssessmentByWorkerID(ctx, w.ID); err == nil {
		personalityBonus = computePersonalityBonus(numericToFloat(pa.IntegrityAvg), true)
	}

	// Worker hunger: fairness bonus for under-scheduled workers.
	hungerBonus := computeWorkerHungerBonus(int(weekCount), config)

	// Determine availability status.
	startHHMM := matching.MicrosToHHMM(bestPlacement.StartMicros)
	endHHMM := matching.MicrosToHHMM(bestPlacement.EndMicros)
	suggestedStart := &startHHMM
	suggestedEnd := &endHHMM
	suggestedDate := &bestDate
	suggestedSlotIndex := &bestSlotIdx
	gapScore := bestPlacement.GapScoreH

	afrom := matching.MicrosToHHMM(bestAvailStart)
	ato := matching.MicrosToHHMM(bestAvailEnd)
	availFrom := &afrom
	availTo := &ato

	// "available" = suggested time falls within the client's requested window.
	var status string
	requestedStart := clientSlots[bestSlotIdx].StartMicros
	requestedEnd := clientSlots[bestSlotIdx].EndMicros
	if bestPlacement.StartMicros >= requestedStart && bestPlacement.EndMicros <= requestedEnd {
		status = "available"
	} else {
		status = "partial"
	}

	// Compute dynamic rating and completed jobs from reviews/bookings tables.
	dynamicRating := numericToFloat(w.RatingAvg) // fallback to DB column
	if avg, err := r.Queries.GetAverageWorkerRating(ctx, w.ID); err == nil {
		dynamicRating = numericToFloat(avg)
	}
	dynamicCompleted := int4Val(w.TotalJobsCompleted) // fallback to DB column
	if count, err := r.Queries.CountCompletedJobsByWorker(ctx, w.ID); err == nil {
		dynamicCompleted = int(count)
	}

	score := matching.ComputeMatchScore(matching.ScoreInput{
		RatingAvg:            dynamicRating,
		TotalJobsDone:        dynamicCompleted,
		IsAreaMatch:          true,
		PlacementFound:       true,
		GapScoreH:            gapScore,
		DayBookingCount:      bestDayCount,
		WeekBookingCount:     int(weekCount),
		Config:               config,
		RouteEfficiencyScore: routeScore,
		ClientAffinityScore:  affinityScore,
		SubRatingBonus:       subRatingBonus,
		PersonalityBonus:     personalityBonus,
		WorkerHungerBonus:    hungerBonus,
	})

	workerID := uuidToString(w.ID)
	userID := uuidToString(w.UserID)

	return &model.WorkerSuggestion{
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
		AvailabilityStatus: status,
		AvailableFrom:      availFrom,
		AvailableTo:        availTo,
		SuggestedStartTime: suggestedStart,
		SuggestedEndTime:   suggestedEnd,
		SuggestedSlotIndex: suggestedSlotIndex,
		SuggestedDate:      suggestedDate,
		MatchScore:         score,
	}
}

// resolveCandidateCoords returns the coordinates of a city area (candidate job location).
// Returns (0, 0, false) if no coordinates are available.
func (r *Resolver) resolveCandidateCoords(ctx context.Context, areaID pgtype.UUID) (lat, lng float64, hasLocation bool) {
	if !areaID.Valid {
		return 0, 0, false
	}
	coords, err := r.Queries.GetCityAreaCoordinates(ctx, areaID)
	if err != nil || !coords.Latitude.Valid || !coords.Longitude.Valid {
		return 0, 0, false
	}
	return coords.Latitude.Float64, coords.Longitude.Float64, true
}
