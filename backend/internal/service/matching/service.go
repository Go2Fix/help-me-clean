package matching

import (
	"fmt"
)

const (
	// HourMicros is the number of microseconds in one hour.
	HourMicros = int64(3_600_000_000)
	// MinuteMicros is the number of microseconds in one minute.
	MinuteMicros = int64(60_000_000)
	// BufferMicros is the default buffer time between jobs (15 minutes).
	BufferMicros = 15 * MinuteMicros
)

// TimeSlot represents a client-provided preferred time window.
type TimeSlot struct {
	StartMicros int64
	EndMicros   int64
}

// FreeInterval represents an available time block in a worker's day.
type FreeInterval struct {
	Start int64
	End   int64
}

// BookingSlot represents an existing booking's occupied time.
type BookingSlot struct {
	StartMicros int64
	EndMicros   int64
}

// PlacementResult represents the system-decided optimal job placement.
type PlacementResult struct {
	StartMicros int64
	EndMicros   int64
	SlotIndex   int     // which client time slot was used (0-based)
	GapScoreH   float64 // total surrounding gap in hours (lower = tighter packing)
	Found       bool
}

// MicrosToHHMM converts microseconds since midnight to "HH:MM" format.
func MicrosToHHMM(us int64) string {
	hours := us / HourMicros
	minutes := (us % HourMicros) / MinuteMicros
	return fmt.Sprintf("%02d:%02d", hours, minutes)
}

// HHMMToMicros parses "HH:MM" to microseconds since midnight.
func HHMMToMicros(s string) int64 {
	var h, m int
	fmt.Sscanf(s, "%d:%d", &h, &m)
	return int64(h)*HourMicros + int64(m)*MinuteMicros
}

// ComputeFreeIntervals calculates free time blocks within an availability window
// by subtracting existing bookings (with buffer time between jobs).
// Bookings must be sorted by start time.
func ComputeFreeIntervals(availStart, availEnd int64, bookings []BookingSlot, buffer int64) []FreeInterval {
	if availStart >= availEnd {
		return nil
	}

	var intervals []FreeInterval
	cursor := availStart

	for _, b := range bookings {
		busyStart := b.StartMicros - buffer
		busyEnd := b.EndMicros + buffer

		// Clamp to availability window.
		if busyStart < availStart {
			busyStart = availStart
		}
		if busyEnd > availEnd {
			busyEnd = availEnd
		}

		// Free time before this booking's buffer zone.
		if cursor < busyStart {
			intervals = append(intervals, FreeInterval{Start: cursor, End: busyStart})
		}

		// Advance cursor past this booking's buffer zone.
		if busyEnd > cursor {
			cursor = busyEnd
		}
	}

	// Remaining free time after last booking.
	if cursor < availEnd {
		intervals = append(intervals, FreeInterval{Start: cursor, End: availEnd})
	}

	return intervals
}

type placementCandidate struct {
	startMicros int64
	endMicros   int64
	slotIndex   int
	minGap      int64 // min(gap to left edge, gap to right edge) of free interval
	totalGap    int64 // sum of both gaps within the free interval
}

// FindOptimalPlacement finds the best position for a job within free intervals,
// considering the client's preferred time slots. For each valid intersection of
// a client slot with a free interval, it tries left-pack (flush with preceding
// booking) and right-pack (flush with following booking), then picks the
// placement that minimizes surrounding gaps for tightest daily packing.
func FindOptimalPlacement(freeIntervals []FreeInterval, clientSlots []TimeSlot, jobDurationMicros int64) PlacementResult {
	var best *placementCandidate

	for slotIdx, clientSlot := range clientSlots {
		for _, free := range freeIntervals {
			// Intersection of client slot and free interval.
			intStart := max(clientSlot.StartMicros, free.Start)
			intEnd := min(clientSlot.EndMicros, free.End)

			if intEnd-intStart < jobDurationMicros {
				continue // intersection too small for the job
			}

			// Left-pack: job starts at beginning of intersection.
			evaluatePlacement(&best, free, intStart, intStart+jobDurationMicros, slotIdx)

			// Right-pack: job ends at end of intersection.
			rightStart := intEnd - jobDurationMicros
			if rightStart != intStart { // avoid duplicate when exact fit
				evaluatePlacement(&best, free, rightStart, intEnd, slotIdx)
			}
		}
	}

	if best == nil {
		return PlacementResult{Found: false}
	}

	return PlacementResult{
		StartMicros: best.startMicros,
		EndMicros:   best.endMicros,
		SlotIndex:   best.slotIndex,
		GapScoreH:   float64(best.totalGap) / float64(HourMicros),
		Found:       true,
	}
}

func evaluatePlacement(best **placementCandidate, free FreeInterval, jobStart, jobEnd int64, slotIdx int) {
	gapBefore := jobStart - free.Start
	gapAfter := free.End - jobEnd
	minGap := min(gapBefore, gapAfter)
	totalGap := gapBefore + gapAfter

	candidate := &placementCandidate{
		startMicros: jobStart,
		endMicros:   jobEnd,
		slotIndex:   slotIdx,
		minGap:      minGap,
		totalGap:    totalGap,
	}

	if *best == nil || isBetterPlacement(candidate, *best) {
		*best = candidate
	}
}

// isBetterPlacement returns true if a is a better placement than b.
// Priority: 1) smaller min gap (prefer flush with edge), 2) smaller total gap
// (prefer tighter intervals), 3) earlier client slot index.
func isBetterPlacement(a, b *placementCandidate) bool {
	if a.minGap != b.minGap {
		return a.minGap < b.minGap
	}
	if a.totalGap != b.totalGap {
		return a.totalGap < b.totalGap
	}
	return a.slotIndex < b.slotIndex
}

// ---------------------------------------------------------------------------
// Multi-day scheduling types and functions
// ---------------------------------------------------------------------------

// DatedTimeSlot extends TimeSlot with date context for multi-day scheduling.
type DatedTimeSlot struct {
	Date        string // "2006-01-02" format
	DayOfWeek   int    // time.Weekday (0=Sunday, 6=Saturday)
	StartMicros int64
	EndMicros   int64
	SlotIndex   int // original index in the client's input array
}

// DatedPlacementResult extends PlacementResult with the matched date.
type DatedPlacementResult struct {
	Date        string  // "2006-01-02" — which date was matched
	StartMicros int64
	EndMicros   int64
	SlotIndex   int     // original client time slot index (0-based)
	GapScoreH   float64 // total surrounding gap in hours
	Found       bool
}

// MatchConfig holds admin-configurable parameters for the matchmaking algorithm.
type MatchConfig struct {
	BufferMinutes     int     // buffer between jobs in minutes (default 15)
	MaxJobsPerDay     int     // max bookings per worker per day (default 6)
	LoadBalanceWeight float64 // weight for workload penalty, 0=disabled (default 10)
	MaxResults        int     // max suggestions to return (default 5)
	MinAvailableCount int     // min available workers before showing unavailable (default 5)
}

// DefaultMatchConfig returns the default matchmaking configuration.
func DefaultMatchConfig() MatchConfig {
	return MatchConfig{
		BufferMinutes:     15,
		MaxJobsPerDay:     6,
		LoadBalanceWeight: 10.0,
		MaxResults:        5,
		MinAvailableCount: 5,
	}
}

// BufferFromConfig returns buffer time in microseconds from config.
func (c MatchConfig) BufferMicros() int64 {
	return int64(c.BufferMinutes) * MinuteMicros
}

// DateAvailability holds pre-computed availability data for one date.
type DateAvailability struct {
	Date          string
	AvailStart    int64
	AvailEnd      int64
	FreeIntervals []FreeInterval
	BookingCount  int // existing bookings on this date
}

// FindBestPlacementAcrossDates evaluates all dated time slots across multiple
// dates and returns the single best placement. It reuses FindOptimalPlacement
// for each date and picks the best result considering gap tightness and load.
func FindBestPlacementAcrossDates(
	dateAvails []DateAvailability,
	datedSlots []DatedTimeSlot,
	jobDurationMicros int64,
	config MatchConfig,
) DatedPlacementResult {
	// Group dated slots by date.
	slotsByDate := map[string][]DatedTimeSlot{}
	for _, ds := range datedSlots {
		slotsByDate[ds.Date] = append(slotsByDate[ds.Date], ds)
	}

	var bestResult *DatedPlacementResult
	var bestScore float64 = -1

	for _, da := range dateAvails {
		// Skip dates where worker already at max jobs.
		if config.MaxJobsPerDay > 0 && da.BookingCount >= config.MaxJobsPerDay {
			continue
		}

		slots, ok := slotsByDate[da.Date]
		if !ok {
			continue
		}

		// Convert DatedTimeSlots to plain TimeSlots for the existing algorithm.
		clientSlots := make([]TimeSlot, len(slots))
		for i, s := range slots {
			clientSlots[i] = TimeSlot{
				StartMicros: s.StartMicros,
				EndMicros:   s.EndMicros,
			}
		}

		placement := FindOptimalPlacement(da.FreeIntervals, clientSlots, jobDurationMicros)
		if !placement.Found {
			continue
		}

		// Score this placement: lower gap = better, fewer existing bookings = better.
		gapPenalty := placement.GapScoreH
		loadPenalty := float64(da.BookingCount) * 0.5
		score := 100.0 - gapPenalty - loadPenalty

		if bestResult == nil || score > bestScore {
			// Map back to original slot index from the client's input.
			originalSlotIndex := slots[placement.SlotIndex].SlotIndex
			bestResult = &DatedPlacementResult{
				Date:        da.Date,
				StartMicros: placement.StartMicros,
				EndMicros:   placement.EndMicros,
				SlotIndex:   originalSlotIndex,
				GapScoreH:   placement.GapScoreH,
				Found:       true,
			}
			bestScore = score
		}
	}

	if bestResult == nil {
		return DatedPlacementResult{Found: false}
	}
	return *bestResult
}

// ScoreInput holds all the factors used to compute a worker's match score.
type ScoreInput struct {
	RatingAvg        float64
	TotalJobsDone    int
	IsAreaMatch      bool
	PlacementFound   bool
	GapScoreH        float64
	DayBookingCount  int // bookings on the matched date
	WeekBookingCount int // bookings this week
	Config           MatchConfig
}

// ComputeMatchScore returns a 0-100 score for a worker suggestion.
func ComputeMatchScore(input ScoreInput) float64 {
	score := 50.0

	// Rating bonus: 0-5 rating * 5 = max 25 points.
	score += input.RatingAvg * 5.0

	// Experience bonus: up to 15 points.
	jobsBonus := float64(input.TotalJobsDone) / 100.0 * 15.0
	if jobsBonus > 15.0 {
		jobsBonus = 15.0
	}
	score += jobsBonus

	// Area match bonus: 10 points.
	if input.IsAreaMatch {
		score += 10.0
	}

	// Packing bonus: 5 points for adjacent placement (gap = 0).
	if input.PlacementFound && input.GapScoreH == 0 {
		score += 5.0
	}

	// Unavailability penalty.
	if !input.PlacementFound {
		score -= 40.0
	}

	// Workload balancing: penalize overloaded workers.
	if input.Config.LoadBalanceWeight > 0 {
		// Daily load: each existing booking today costs loadWeight/2 points.
		dailyPenalty := float64(input.DayBookingCount) * (input.Config.LoadBalanceWeight / 2.0)
		score -= dailyPenalty

		// Weekly load: each booking this week costs loadWeight/10 points.
		weeklyPenalty := float64(input.WeekBookingCount) * (input.Config.LoadBalanceWeight / 10.0)
		score -= weeklyPenalty
	}

	// Clamp to [0, 100].
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}

	return score
}
