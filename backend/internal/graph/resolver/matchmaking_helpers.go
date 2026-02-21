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

	log.Printf("[MATCHMAKING] Config loaded: buffer=%dmin, maxJobs=%d, loadWeight=%.1f, minAvail=%d",
		config.BufferMinutes, config.MaxJobsPerDay, config.LoadBalanceWeight, config.MinAvailableCount)

	return config
}
