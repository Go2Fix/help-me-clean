package resolver

import (
	"fmt"
	"math"
	"path/filepath"
	"strings"

	db "go2fix-backend/internal/db/generated"
)

// microsecondsToHHMM converts PostgreSQL TIME microseconds to "HH:MM" string.
func microsecondsToHHMM(us int64) string {
	hours := us / 3_600_000_000
	minutes := (us % 3_600_000_000) / 60_000_000
	return fmt.Sprintf("%02d:%02d", hours, minutes)
}

// estimateDuration calculates the estimated job duration in hours based on
// the service definition parameters and the property details.
func estimateDuration(serviceDef db.ServiceDefinition, numRooms, numBathrooms int, areaSqm *int, propertyType *string, hasPets *bool, extras []struct {
	DurationMinutes int32
	Quantity        int
}) float64 {
	hoursPerRoom := numericToFloat(serviceDef.HoursPerRoom)
	hoursPerBathroom := numericToFloat(serviceDef.HoursPerBathroom)
	hoursPer100Sqm := numericToFloat(serviceDef.HoursPer100Sqm)
	houseMultiplier := numericToFloat(serviceDef.HouseMultiplier)
	petDurationMin := float64(serviceDef.PetDurationMinutes)
	minHours := numericToFloat(serviceDef.MinHours)

	hours := float64(numRooms)*hoursPerRoom + float64(numBathrooms)*hoursPerBathroom
	if areaSqm != nil {
		hours += float64(*areaSqm) / 100.0 * hoursPer100Sqm
	}

	// Property type multiplier (house vs apartment).
	if propertyType != nil {
		switch strings.ToLower(*propertyType) {
		case "casa", "house":
			hours *= houseMultiplier
		}
	}

	// Pet duration.
	if hasPets != nil && *hasPets && petDurationMin > 0 {
		hours += petDurationMin / 60.0
	}

	// Extras duration.
	for _, e := range extras {
		hours += float64(e.DurationMinutes) * float64(e.Quantity) / 60.0
	}

	// Enforce minimum hours.
	if hours < minHours {
		hours = minHours
	}

	// Round to nearest 0.5.
	hours = math.Round(hours*2) / 2

	return hours
}

// isImageFile checks if the filename has an image extension
func isImageFile(filename string) bool {
	ext := filepath.Ext(strings.ToLower(filename))
	return ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".webp"
}
