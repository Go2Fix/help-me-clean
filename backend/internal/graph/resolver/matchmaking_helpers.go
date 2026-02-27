package resolver

import (
	"context"
	"log"
	"strconv"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/service/matching"
)

// loadMatchConfig reads matchmaking settings from platform_settings KV table,
// falling back to DefaultMatchConfig for any missing keys.
func loadMatchConfig(ctx context.Context, queries *db.Queries) matching.MatchConfig {
	config := matching.DefaultMatchConfig()

	if v, err := queries.GetPlatformSetting(ctx, "matchmaking_buffer_minutes"); err == nil {
		if n, err := strconv.Atoi(v.Value); err == nil && n > 0 {
			config.BufferMinutes = n
		}
	}
	if v, err := queries.GetPlatformSetting(ctx, "matchmaking_max_jobs_per_day"); err == nil {
		if n, err := strconv.Atoi(v.Value); err == nil && n > 0 {
			config.MaxJobsPerDay = n
		}
	}
	if v, err := queries.GetPlatformSetting(ctx, "matchmaking_load_balance_weight"); err == nil {
		if f, err := strconv.ParseFloat(v.Value, 64); err == nil && f >= 0 {
			config.LoadBalanceWeight = f
		}
	}
	if v, err := queries.GetPlatformSetting(ctx, "matchmaking_min_available_count"); err == nil {
		if n, err := strconv.Atoi(v.Value); err == nil && n >= 0 {
			config.MinAvailableCount = n
		}
	}
	if v, err := queries.GetPlatformSetting(ctx, "matchmaking_weekly_target_jobs"); err == nil {
		if n, err := strconv.Atoi(v.Value); err == nil && n > 0 {
			config.WeeklyTargetJobs = n
		}
	}
	if v, err := queries.GetPlatformSetting(ctx, "matchmaking_hunger_weight"); err == nil {
		if f, err := strconv.ParseFloat(v.Value, 64); err == nil && f >= 0 {
			config.HungerWeight = f
		}
	}
	if v, err := queries.GetPlatformSetting(ctx, "matchmaking_route_efficiency_weight"); err == nil {
		if f, err := strconv.ParseFloat(v.Value, 64); err == nil && f >= 0 {
			config.RouteEfficiencyWeight = f
		}
	}
	if v, err := queries.GetPlatformSetting(ctx, "matchmaking_affinity_bonus"); err == nil {
		if f, err := strconv.ParseFloat(v.Value, 64); err == nil && f >= 0 {
			config.AffinityBonus = f
		}
	}

	log.Printf("[MATCHMAKING] Config: buffer=%dmin maxJobs=%d loadW=%.1f minAvail=%d weeklyTarget=%d hungerW=%.1f routeW=%.1f affinityB=%.1f",
		config.BufferMinutes, config.MaxJobsPerDay, config.LoadBalanceWeight, config.MinAvailableCount,
		config.WeeklyTargetJobs, config.HungerWeight, config.RouteEfficiencyWeight, config.AffinityBonus)

	return config
}

// computeRouteEfficiencyScore returns a 0–20 bonus based on how geographically
// close the candidate job is to the worker's existing daily jobs.
// A neutral 10 is returned when the worker has no jobs yet that day.
func computeRouteEfficiencyScore(candidateLat, candidateLng float64, existingJobs []matching.JobLocation) float64 {
	if len(existingJobs) == 0 {
		return 10.0 // open day — neutral
	}

	var totalDist float64
	count := 0
	for _, j := range existingJobs {
		if j.HasLocation {
			totalDist += matching.HaversineKm(candidateLat, candidateLng, j.Lat, j.Lng)
			count++
		}
	}
	if count == 0 {
		return 10.0 // no location data available
	}
	avgDistKm := totalDist / float64(count)

	switch {
	case avgDistKm <= 2.0:
		return 20.0 // same neighbourhood
	case avgDistKm <= 5.0:
		return 15.0 // same sector
	case avgDistKm <= 10.0:
		return 8.0 // adjacent sector
	case avgDistKm <= 20.0:
		return 3.0 // cross-city
	default:
		return 0.0 // very far — no bonus
	}
}

// computeClientAffinityScore returns a 0–affinityBonus score based on the
// worker's history with this specific client.
func computeClientAffinityScore(totalJobs int32, avgRating float64, affinityBonus float64) float64 {
	if totalJobs == 0 {
		return 0.0
	}
	switch {
	case avgRating >= 4.5:
		return affinityBonus
	case avgRating >= 3.5:
		return affinityBonus * 0.6
	default:
		return affinityBonus * 0.2 // worker knows client, small bonus regardless
	}
}

// computeSubRatingBonus returns a 0–8 bonus from per-dimension ratings
// (punctuality + quality). Requires at least 3 rated reviews to be meaningful.
func computeSubRatingBonus(avgPunctuality, avgQuality float64, ratedCount int32) float64 {
	if ratedCount < 3 {
		return 0.0
	}
	punctualityBonus := (avgPunctuality / 5.0) * 3.0 // max +3
	qualityBonus := (avgQuality / 5.0) * 5.0          // max +5
	total := punctualityBonus + qualityBonus
	if total > 8.0 {
		return 8.0
	}
	return total
}

// computePersonalityBonus returns a 0–5 bonus from a worker's personality
// assessment integrity score (0–20 scale). Workers scoring below the midpoint
// of 10 receive no bonus.
func computePersonalityBonus(integrityAvg float64, hasAssessment bool) float64 {
	if !hasAssessment {
		return 0.0
	}
	bonus := (integrityAvg - 10.0) / 10.0 * 5.0
	if bonus < 0 {
		return 0.0
	}
	if bonus > 5.0 {
		return 5.0
	}
	return bonus
}

// computeWorkerHungerBonus returns a 0–hungerWeight bonus that favours
// under-scheduled workers for fair workload distribution.
func computeWorkerHungerBonus(weekBookingCount int, config matching.MatchConfig) float64 {
	if config.WeeklyTargetJobs <= 0 {
		return 0.0
	}
	fillRate := float64(weekBookingCount) / float64(config.WeeklyTargetJobs)
	switch {
	case fillRate >= 1.0:
		return 0.0
	case fillRate >= 0.75:
		return config.HungerWeight * 0.1
	case fillRate >= 0.50:
		return config.HungerWeight * 0.4
	default:
		return config.HungerWeight
	}
}
