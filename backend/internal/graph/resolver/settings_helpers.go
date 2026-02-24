package resolver

import (
	"fmt"
	"strconv"
	"strings"
)

// validatePlatformSetting validates the value for a given platform setting key.
func validatePlatformSetting(key, value string) error {
	switch {
	// Percentage fields (0-100)
	case strings.HasSuffix(key, "_pct"):
		return validatePercentage(key, value)

	// Hour fields (>= 0)
	case strings.Contains(key, "_hours"):
		return validateNonNegativeNumber(key, value)

	// Rate fields (> 0)
	case strings.Contains(key, "_rate") || strings.Contains(key, "hourly"):
		return validatePositiveNumber(key, value)

	// Max/min integer fields
	case strings.HasPrefix(key, "max_") || strings.HasPrefix(key, "min_") || strings.Contains(key, "_max_"):
		return validateNonNegativeInteger(key, value)

	// Boolean fields
	case strings.HasPrefix(key, "require_"):
		return validateBoolean(key, value)

	// Email
	case strings.Contains(key, "email"):
		if !strings.Contains(value, "@") {
			return fmt.Errorf("%s must be a valid email address", key)
		}

	// Phone
	case strings.Contains(key, "phone"):
		if !strings.HasPrefix(value, "+") {
			return fmt.Errorf("%s must start with '+' (international format)", key)
		}

	// URL fields
	case strings.HasSuffix(key, "_url"):
		if !strings.HasPrefix(value, "https://") && !strings.HasPrefix(value, "http://") {
			return fmt.Errorf("%s must be a valid URL starting with https://", key)
		}
	}

	return nil
}

func validatePercentage(key, value string) error {
	v, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return fmt.Errorf("%s must be a number, got %q", key, value)
	}
	if v < 0 || v > 100 {
		return fmt.Errorf("%s must be between 0 and 100, got %v", key, v)
	}
	return nil
}

func validateNonNegativeNumber(key, value string) error {
	v, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return fmt.Errorf("%s must be a number, got %q", key, value)
	}
	if v < 0 {
		return fmt.Errorf("%s must be >= 0, got %v", key, v)
	}
	return nil
}

func validatePositiveNumber(key, value string) error {
	v, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return fmt.Errorf("%s must be a number, got %q", key, value)
	}
	if v <= 0 {
		return fmt.Errorf("%s must be > 0, got %v", key, v)
	}
	return nil
}

func validateNonNegativeInteger(key, value string) error {
	v, err := strconv.Atoi(value)
	if err != nil {
		return fmt.Errorf("%s must be an integer, got %q", key, value)
	}
	if v < 0 {
		return fmt.Errorf("%s must be >= 0, got %v", key, v)
	}
	return nil
}

func validateBoolean(key, value string) error {
	if value != "true" && value != "false" {
		return fmt.Errorf("%s must be 'true' or 'false', got %q", key, value)
	}
	return nil
}
