package matching

import (
	"testing"
)

// Helpers for readable test values.
func h(hours int) int64        { return int64(hours) * HourMicros }
func hm(hours, mins int) int64 { return int64(hours)*HourMicros + int64(mins)*MinuteMicros }

// ---------------------------------------------------------------------------
// ComputeFreeIntervals
// ---------------------------------------------------------------------------

func TestComputeFreeIntervals(t *testing.T) {
	tests := []struct {
		name       string
		availStart int64
		availEnd   int64
		bookings   []BookingSlot
		buffer     int64
		want       []FreeInterval
	}{
		{
			name:       "no bookings - full window free",
			availStart: h(8),
			availEnd:   h(17),
			bookings:   nil,
			buffer:     BufferMicros,
			want:       []FreeInterval{{Start: h(8), End: h(17)}},
		},
		{
			name:       "one booking in middle",
			availStart: h(8),
			availEnd:   h(17),
			bookings:   []BookingSlot{{StartMicros: h(10), EndMicros: h(12)}},
			buffer:     BufferMicros,
			want: []FreeInterval{
				{Start: h(8), End: hm(9, 45)},
				{Start: hm(12, 15), End: h(17)},
			},
		},
		{
			name:       "booking at start of window",
			availStart: h(8),
			availEnd:   h(17),
			bookings:   []BookingSlot{{StartMicros: h(8), EndMicros: h(10)}},
			buffer:     BufferMicros,
			want:       []FreeInterval{{Start: hm(10, 15), End: h(17)}},
		},
		{
			name:       "booking at end of window",
			availStart: h(8),
			availEnd:   h(17),
			bookings:   []BookingSlot{{StartMicros: h(15), EndMicros: h(17)}},
			buffer:     BufferMicros,
			want:       []FreeInterval{{Start: h(8), End: hm(14, 45)}},
		},
		{
			name:       "multiple bookings",
			availStart: h(8),
			availEnd:   h(17),
			bookings: []BookingSlot{
				{StartMicros: h(9), EndMicros: h(11)},
				{StartMicros: h(14), EndMicros: h(16)},
			},
			buffer: BufferMicros,
			want: []FreeInterval{
				{Start: h(8), End: hm(8, 45)},
				{Start: hm(11, 15), End: hm(13, 45)},
				{Start: hm(16, 15), End: h(17)},
			},
		},
		{
			name:       "booking buffer clamped to window start",
			availStart: h(8),
			availEnd:   h(17),
			bookings:   []BookingSlot{{StartMicros: h(8), EndMicros: hm(8, 30)}},
			buffer:     BufferMicros,
			want:       []FreeInterval{{Start: hm(8, 45), End: h(17)}},
		},
		{
			name:       "zero buffer",
			availStart: h(8),
			availEnd:   h(17),
			bookings:   []BookingSlot{{StartMicros: h(10), EndMicros: h(12)}},
			buffer:     0,
			want: []FreeInterval{
				{Start: h(8), End: h(10)},
				{Start: h(12), End: h(17)},
			},
		},
		{
			name:       "back-to-back bookings fill window",
			availStart: h(8),
			availEnd:   h(12),
			bookings: []BookingSlot{
				{StartMicros: h(8), EndMicros: h(10)},
				{StartMicros: h(10), EndMicros: h(12)},
			},
			buffer: 0,
			want:   nil,
		},
		{
			name:       "invalid window (start >= end)",
			availStart: h(17),
			availEnd:   h(8),
			bookings:   nil,
			buffer:     BufferMicros,
			want:       nil,
		},
		{
			name:       "overlapping bookings treated correctly",
			availStart: h(8),
			availEnd:   h(17),
			bookings: []BookingSlot{
				{StartMicros: h(10), EndMicros: h(13)},
				{StartMicros: h(12), EndMicros: h(14)}, // overlaps with first
			},
			buffer: BufferMicros,
			want: []FreeInterval{
				{Start: h(8), End: hm(9, 45)},
				{Start: hm(14, 15), End: h(17)},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ComputeFreeIntervals(tt.availStart, tt.availEnd, tt.bookings, tt.buffer)
			if len(got) != len(tt.want) {
				t.Fatalf("got %d intervals, want %d\n  got:  %s\n  want: %s",
					len(got), len(tt.want), formatIntervals(got), formatIntervals(tt.want))
			}
			for i := range got {
				if got[i].Start != tt.want[i].Start || got[i].End != tt.want[i].End {
					t.Errorf("interval[%d]: got [%s-%s], want [%s-%s]",
						i, MicrosToHHMM(got[i].Start), MicrosToHHMM(got[i].End),
						MicrosToHHMM(tt.want[i].Start), MicrosToHHMM(tt.want[i].End))
				}
			}
		})
	}
}

// ---------------------------------------------------------------------------
// FindOptimalPlacement
// ---------------------------------------------------------------------------

func TestFindOptimalPlacement(t *testing.T) {
	tests := []struct {
		name          string
		freeIntervals []FreeInterval
		clientSlots   []TimeSlot
		jobDuration   int64
		wantFound     bool
		wantStart     int64
		wantEnd       int64
		wantSlotIndex int
	}{
		{
			name:          "exact fit - single slot single interval",
			freeIntervals: []FreeInterval{{Start: h(10), End: h(12)}},
			clientSlots:   []TimeSlot{{StartMicros: h(10), EndMicros: h(12)}},
			jobDuration:   h(2),
			wantFound:     true,
			wantStart:     h(10),
			wantEnd:       h(12),
			wantSlotIndex: 0,
		},
		{
			name:          "left-pack preferred - flush with preceding booking",
			freeIntervals: []FreeInterval{{Start: h(10), End: h(14)}},
			clientSlots:   []TimeSlot{{StartMicros: h(10), EndMicros: h(14)}},
			jobDuration:   h(2),
			wantFound:     true,
			wantStart:     h(10),
			wantEnd:       h(12),
			wantSlotIndex: 0,
		},
		{
			name:          "client slot within free interval - intersection limits placement",
			freeIntervals: []FreeInterval{{Start: h(8), End: h(14)}},
			clientSlots:   []TimeSlot{{StartMicros: h(12), EndMicros: h(14)}},
			jobDuration:   h(2),
			wantFound:     true,
			wantStart:     h(12),
			wantEnd:       h(14),
			wantSlotIndex: 0,
		},
		{
			name: "picks tighter interval over loose one",
			freeIntervals: []FreeInterval{
				{Start: h(8), End: h(14)},  // 6h free
				{Start: h(15), End: h(17)}, // 2h free (exact fit)
			},
			clientSlots:   []TimeSlot{{StartMicros: h(8), EndMicros: h(17)}},
			jobDuration:   h(2),
			wantFound:     true,
			wantStart:     h(15),
			wantEnd:       h(17),
			wantSlotIndex: 0,
		},
		{
			name:          "no valid placement - interval too small",
			freeIntervals: []FreeInterval{{Start: h(10), End: h(11)}},
			clientSlots:   []TimeSlot{{StartMicros: h(10), EndMicros: h(13)}},
			jobDuration:   h(2),
			wantFound:     false,
		},
		{
			name:          "empty free intervals",
			freeIntervals: nil,
			clientSlots:   []TimeSlot{{StartMicros: h(10), EndMicros: h(13)}},
			jobDuration:   h(2),
			wantFound:     false,
		},
		{
			name:          "no client slots",
			freeIntervals: []FreeInterval{{Start: h(8), End: h(17)}},
			clientSlots:   nil,
			jobDuration:   h(2),
			wantFound:     false,
		},
		{
			name:          "multiple client slots - picks best from second",
			freeIntervals: []FreeInterval{{Start: h(14), End: h(16)}},
			clientSlots: []TimeSlot{
				{StartMicros: h(8), EndMicros: h(11)},  // no overlap
				{StartMicros: h(14), EndMicros: h(16)}, // exact match
			},
			jobDuration:   h(2),
			wantFound:     true,
			wantStart:     h(14),
			wantEnd:       h(16),
			wantSlotIndex: 1,
		},
		{
			name:          "prefers earlier slot when equal score",
			freeIntervals: []FreeInterval{{Start: h(10), End: h(14)}},
			clientSlots: []TimeSlot{
				{StartMicros: h(10), EndMicros: h(14)},
				{StartMicros: h(10), EndMicros: h(14)},
			},
			jobDuration:   h(2),
			wantFound:     true,
			wantStart:     h(10),
			wantEnd:       h(12),
			wantSlotIndex: 0,
		},
		{
			name:          "partial overlap between client slot and free interval",
			freeIntervals: []FreeInterval{{Start: h(8), End: h(12)}},
			clientSlots:   []TimeSlot{{StartMicros: h(10), EndMicros: h(14)}},
			jobDuration:   h(2),
			wantFound:     true,
			wantStart:     h(10),
			wantEnd:       h(12),
			wantSlotIndex: 0,
		},
		{
			name: "adjacent placement example from plan",
			// Worker day: [08:00-10:00 busy] [free] [14:00-16:00 busy] [free] [17:00 end]
			freeIntervals: []FreeInterval{
				{Start: hm(10, 15), End: hm(13, 45)},
				{Start: hm(16, 15), End: h(17)},
			},
			clientSlots:   []TimeSlot{{StartMicros: h(10), EndMicros: h(13)}},
			jobDuration:   h(2),
			wantFound:     true,
			wantStart:     hm(10, 15),
			wantEnd:       hm(12, 15),
			wantSlotIndex: 0,
		},
		{
			name: "1.5h job fits precisely",
			freeIntervals: []FreeInterval{
				{Start: h(9), End: hm(10, 30)},
			},
			clientSlots:   []TimeSlot{{StartMicros: h(9), EndMicros: hm(10, 30)}},
			jobDuration:   hm(1, 30),
			wantFound:     true,
			wantStart:     h(9),
			wantEnd:       hm(10, 30),
			wantSlotIndex: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FindOptimalPlacement(tt.freeIntervals, tt.clientSlots, tt.jobDuration)

			if got.Found != tt.wantFound {
				t.Fatalf("Found = %v, want %v", got.Found, tt.wantFound)
			}

			if !tt.wantFound {
				return
			}

			if got.StartMicros != tt.wantStart {
				t.Errorf("Start = %s, want %s", MicrosToHHMM(got.StartMicros), MicrosToHHMM(tt.wantStart))
			}
			if got.EndMicros != tt.wantEnd {
				t.Errorf("End = %s, want %s", MicrosToHHMM(got.EndMicros), MicrosToHHMM(tt.wantEnd))
			}
			if got.SlotIndex != tt.wantSlotIndex {
				t.Errorf("SlotIndex = %d, want %d", got.SlotIndex, tt.wantSlotIndex)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// MicrosToHHMM / HHMMToMicros
// ---------------------------------------------------------------------------

func TestMicrosToHHMM(t *testing.T) {
	tests := []struct {
		micros int64
		want   string
	}{
		{0, "00:00"},
		{h(8), "08:00"},
		{hm(10, 30), "10:30"},
		{hm(23, 59), "23:59"},
		{hm(14, 45), "14:45"},
	}
	for _, tt := range tests {
		got := MicrosToHHMM(tt.micros)
		if got != tt.want {
			t.Errorf("MicrosToHHMM(%d) = %q, want %q", tt.micros, got, tt.want)
		}
	}
}

func TestHHMMToMicros(t *testing.T) {
	tests := []struct {
		input string
		want  int64
	}{
		{"00:00", 0},
		{"08:00", h(8)},
		{"10:30", hm(10, 30)},
		{"23:59", hm(23, 59)},
	}
	for _, tt := range tests {
		got := HHMMToMicros(tt.input)
		if got != tt.want {
			t.Errorf("HHMMToMicros(%q) = %d, want %d", tt.input, got, tt.want)
		}
	}
}

// ---------------------------------------------------------------------------
// FindBestPlacementAcrossDates
// ---------------------------------------------------------------------------

func TestFindBestPlacementAcrossDates_SingleDate(t *testing.T) {
	// Backward compatibility: single date should work exactly like FindOptimalPlacement.
	dateAvails := []DateAvailability{
		{Date: "2026-03-02", AvailStart: h(8), AvailEnd: h(17), FreeIntervals: []FreeInterval{{Start: h(8), End: h(17)}}, BookingCount: 0},
	}
	datedSlots := []DatedTimeSlot{
		{Date: "2026-03-02", DayOfWeek: 1, StartMicros: h(8), EndMicros: h(14), SlotIndex: 0},
	}

	result := FindBestPlacementAcrossDates(dateAvails, datedSlots, h(4), DefaultMatchConfig())

	if !result.Found {
		t.Fatal("expected placement to be found")
	}
	if result.Date != "2026-03-02" {
		t.Errorf("Date = %s, want 2026-03-02", result.Date)
	}
	if result.StartMicros != h(8) {
		t.Errorf("Start = %s, want 08:00", MicrosToHHMM(result.StartMicros))
	}
	if result.EndMicros != h(12) {
		t.Errorf("End = %s, want 12:00", MicrosToHHMM(result.EndMicros))
	}
	if result.SlotIndex != 0 {
		t.Errorf("SlotIndex = %d, want 0", result.SlotIndex)
	}
}

func TestFindBestPlacementAcrossDates_MultiDate(t *testing.T) {
	// Worker unavailable on day 1 (Saturday - no free intervals), available on day 2 (Monday).
	dateAvails := []DateAvailability{
		{Date: "2026-02-28", AvailStart: h(8), AvailEnd: h(14), FreeIntervals: nil, BookingCount: 0}, // Saturday - no availability
		{Date: "2026-03-02", AvailStart: h(8), AvailEnd: h(20), FreeIntervals: []FreeInterval{{Start: h(8), End: h(20)}}, BookingCount: 0}, // Monday - fully free
	}
	datedSlots := []DatedTimeSlot{
		{Date: "2026-02-28", DayOfWeek: 6, StartMicros: h(8), EndMicros: h(14), SlotIndex: 0},
		{Date: "2026-03-02", DayOfWeek: 1, StartMicros: h(8), EndMicros: h(20), SlotIndex: 1},
	}

	result := FindBestPlacementAcrossDates(dateAvails, datedSlots, h(4), DefaultMatchConfig())

	if !result.Found {
		t.Fatal("expected placement to be found")
	}
	if result.Date != "2026-03-02" {
		t.Errorf("Date = %s, want 2026-03-02 (Monday)", result.Date)
	}
	if result.SlotIndex != 1 {
		t.Errorf("SlotIndex = %d, want 1 (Monday slot)", result.SlotIndex)
	}
}

func TestFindBestPlacementAcrossDates_MaxJobsExceeded(t *testing.T) {
	// All dates at max capacity.
	config := DefaultMatchConfig()
	config.MaxJobsPerDay = 3

	dateAvails := []DateAvailability{
		{Date: "2026-02-28", AvailStart: h(8), AvailEnd: h(17), FreeIntervals: []FreeInterval{{Start: h(14), End: h(17)}}, BookingCount: 3},
		{Date: "2026-03-01", AvailStart: h(8), AvailEnd: h(17), FreeIntervals: []FreeInterval{{Start: h(14), End: h(17)}}, BookingCount: 4},
	}
	datedSlots := []DatedTimeSlot{
		{Date: "2026-02-28", DayOfWeek: 6, StartMicros: h(14), EndMicros: h(17), SlotIndex: 0},
		{Date: "2026-03-01", DayOfWeek: 0, StartMicros: h(14), EndMicros: h(17), SlotIndex: 1},
	}

	result := FindBestPlacementAcrossDates(dateAvails, datedSlots, h(2), config)

	if result.Found {
		t.Error("expected no placement when all dates at max jobs")
	}
}

func TestFindBestPlacementAcrossDates_PrefersBetterPacking(t *testing.T) {
	// Two dates both have free intervals. Day 1 has tighter gap (exact fit).
	dateAvails := []DateAvailability{
		{Date: "2026-03-02", AvailStart: h(8), AvailEnd: h(17), FreeIntervals: []FreeInterval{{Start: h(8), End: h(12)}}, BookingCount: 0}, // exact fit for 4h job
		{Date: "2026-03-03", AvailStart: h(8), AvailEnd: h(17), FreeIntervals: []FreeInterval{{Start: h(8), End: h(17)}}, BookingCount: 0}, // 9h free (loose)
	}
	datedSlots := []DatedTimeSlot{
		{Date: "2026-03-02", DayOfWeek: 1, StartMicros: h(8), EndMicros: h(12), SlotIndex: 0},
		{Date: "2026-03-03", DayOfWeek: 2, StartMicros: h(8), EndMicros: h(17), SlotIndex: 1},
	}

	result := FindBestPlacementAcrossDates(dateAvails, datedSlots, h(4), DefaultMatchConfig())

	if !result.Found {
		t.Fatal("expected placement to be found")
	}
	if result.Date != "2026-03-02" {
		t.Errorf("Date = %s, want 2026-03-02 (tighter packing)", result.Date)
	}
}

func TestFindBestPlacementAcrossDates_PrefersLowerLoadDate(t *testing.T) {
	// Two dates with identical free intervals, but day 2 has fewer bookings.
	dateAvails := []DateAvailability{
		{Date: "2026-03-02", AvailStart: h(14), AvailEnd: h(18), FreeIntervals: []FreeInterval{{Start: h(14), End: h(18)}}, BookingCount: 3},
		{Date: "2026-03-03", AvailStart: h(14), AvailEnd: h(18), FreeIntervals: []FreeInterval{{Start: h(14), End: h(18)}}, BookingCount: 0},
	}
	datedSlots := []DatedTimeSlot{
		{Date: "2026-03-02", DayOfWeek: 1, StartMicros: h(14), EndMicros: h(18), SlotIndex: 0},
		{Date: "2026-03-03", DayOfWeek: 2, StartMicros: h(14), EndMicros: h(18), SlotIndex: 1},
	}

	result := FindBestPlacementAcrossDates(dateAvails, datedSlots, h(4), DefaultMatchConfig())

	if !result.Found {
		t.Fatal("expected placement to be found")
	}
	if result.Date != "2026-03-03" {
		t.Errorf("Date = %s, want 2026-03-03 (lower load)", result.Date)
	}
}

func TestFindBestPlacementAcrossDates_NoMatchingSlots(t *testing.T) {
	// Date availability exists but no matching dated slots for that date.
	dateAvails := []DateAvailability{
		{Date: "2026-03-02", AvailStart: h(8), AvailEnd: h(17), FreeIntervals: []FreeInterval{{Start: h(8), End: h(17)}}, BookingCount: 0},
	}
	datedSlots := []DatedTimeSlot{
		{Date: "2026-03-03", DayOfWeek: 2, StartMicros: h(8), EndMicros: h(14), SlotIndex: 0}, // Different date
	}

	result := FindBestPlacementAcrossDates(dateAvails, datedSlots, h(4), DefaultMatchConfig())

	if result.Found {
		t.Error("expected no placement when no slots match available dates")
	}
}

// ---------------------------------------------------------------------------
// ComputeMatchScore
// ---------------------------------------------------------------------------

func TestComputeMatchScore_BaseCase(t *testing.T) {
	score := ComputeMatchScore(ScoreInput{
		RatingAvg:     4.5,
		TotalJobsDone: 50,
		IsAreaMatch:   true,
		PlacementFound: true,
		GapScoreH:     0,
		Config:        DefaultMatchConfig(),
	})
	// 50 + (4.5*5=22.5) + (50/100*15=7.5) + 10 + 5 = 95
	expected := 95.0
	if score != expected {
		t.Errorf("score = %.1f, want %.1f", score, expected)
	}
}

func TestComputeMatchScore_WorkloadPenalty(t *testing.T) {
	config := DefaultMatchConfig() // LoadBalanceWeight = 10

	// Worker with 3 daily bookings and 10 weekly.
	score := ComputeMatchScore(ScoreInput{
		RatingAvg:        4.0,
		TotalJobsDone:    20,
		IsAreaMatch:      true,
		PlacementFound:   true,
		GapScoreH:        1.0,
		DayBookingCount:  3,
		WeekBookingCount: 10,
		Config:           config,
	})
	// 50 + 20 + 3 + 10 + 0 - 0 - (3*5=15) - (10*1=10) = 58
	expected := 58.0
	if score != expected {
		t.Errorf("score = %.1f, want %.1f", score, expected)
	}
}

func TestComputeMatchScore_ZeroLoadBalanceWeight(t *testing.T) {
	config := DefaultMatchConfig()
	config.LoadBalanceWeight = 0

	// Even with high load, no workload penalty.
	score := ComputeMatchScore(ScoreInput{
		RatingAvg:        4.0,
		TotalJobsDone:    20,
		IsAreaMatch:      true,
		PlacementFound:   true,
		GapScoreH:        0,
		DayBookingCount:  5,
		WeekBookingCount: 20,
		Config:           config,
	})
	// 50 + 20 + 3 + 10 + 5 = 88 (no workload penalty)
	expected := 88.0
	if score != expected {
		t.Errorf("score = %.1f, want %.1f", score, expected)
	}
}

func TestComputeMatchScore_Clamping(t *testing.T) {
	config := DefaultMatchConfig()

	// Score would go below 0 without clamping.
	score := ComputeMatchScore(ScoreInput{
		RatingAvg:        0,
		TotalJobsDone:    0,
		IsAreaMatch:      false,
		PlacementFound:   false,
		DayBookingCount:  5,
		WeekBookingCount: 20,
		Config:           config,
	})
	if score != 0 {
		t.Errorf("score = %.1f, want 0 (clamped)", score)
	}

	// Score would go above 100 without clamping (not really possible with current formula,
	// but verify the clamp exists).
	score2 := ComputeMatchScore(ScoreInput{
		RatingAvg:      5.0,
		TotalJobsDone:  200,
		IsAreaMatch:    true,
		PlacementFound: true,
		GapScoreH:      0,
		Config:         config,
	})
	if score2 > 100 {
		t.Errorf("score = %.1f, should be clamped to 100", score2)
	}
}

func TestComputeMatchScore_UnavailablePenalty(t *testing.T) {
	score := ComputeMatchScore(ScoreInput{
		RatingAvg:      3.0,
		TotalJobsDone:  10,
		IsAreaMatch:    true,
		PlacementFound: false,
		Config:         DefaultMatchConfig(),
	})
	// 50 + 15 + 1.5 + 10 - 40 = 36.5
	expected := 36.5
	if score != expected {
		t.Errorf("score = %.1f, want %.1f", score, expected)
	}
}

// ---------------------------------------------------------------------------
// MatchConfig
// ---------------------------------------------------------------------------

func TestDefaultMatchConfig(t *testing.T) {
	c := DefaultMatchConfig()
	if c.BufferMinutes != 15 {
		t.Errorf("BufferMinutes = %d, want 15", c.BufferMinutes)
	}
	if c.MaxJobsPerDay != 6 {
		t.Errorf("MaxJobsPerDay = %d, want 6", c.MaxJobsPerDay)
	}
	if c.LoadBalanceWeight != 10.0 {
		t.Errorf("LoadBalanceWeight = %.1f, want 10.0", c.LoadBalanceWeight)
	}
	if c.MaxResults != 5 {
		t.Errorf("MaxResults = %d, want 5", c.MaxResults)
	}
	if c.MinAvailableCount != 5 {
		t.Errorf("MinAvailableCount = %d, want 5", c.MinAvailableCount)
	}
}

func TestMatchConfig_BufferMicros(t *testing.T) {
	c := MatchConfig{BufferMinutes: 30}
	want := int64(30) * MinuteMicros
	if c.BufferMicros() != want {
		t.Errorf("BufferMicros() = %d, want %d", c.BufferMicros(), want)
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func formatIntervals(intervals []FreeInterval) string {
	s := "["
	for i, iv := range intervals {
		if i > 0 {
			s += ", "
		}
		s += MicrosToHHMM(iv.Start) + "-" + MicrosToHHMM(iv.End)
	}
	return s + "]"
}
