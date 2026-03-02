package middleware

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/99designs/gqlgen/graphql"
	"github.com/vektah/gqlparser/v2/gqlerror"
)

// SanitizeError returns a user-safe error message.
// In production, this hides implementation details that could aid attackers.
// In development, it returns full error messages for debugging.
func SanitizeError(ctx context.Context, err error) error {
	if err == nil {
		return nil
	}

	env := os.Getenv("ENVIRONMENT")
	isDevelopment := env == "development" || env == "test" || env == ""

	// In development, return full error for debugging
	if isDevelopment {
		return err
	}

	// In production, sanitize error messages
	errMsg := err.Error()

	// Known safe error patterns to return as-is
	safePatterns := []string{
		"not authenticated",
		"unauthorized",
		"not found",
		"invalid input",
		"validation failed",
		"rate limit exceeded",
		"too many requests",
		"query exceeds maximum depth",
		"file size",
		"file extension",
		"file type",
		"file content type",
	}

	for _, pattern := range safePatterns {
		if strings.Contains(strings.ToLower(errMsg), pattern) {
			return err
		}
	}

	// For all other errors, return generic message and log full error
	log.Printf("[ERROR] %v", err)
	return errors.New("an internal error occurred")
}

// ErrorPresenter creates a GraphQL error presenter that sanitizes errors in production.
// This prevents leaking sensitive information like SQL queries, file paths, or stack traces.
func ErrorPresenter() graphql.ErrorPresenterFunc {
	return func(ctx context.Context, err error) *gqlerror.Error {
		// Get the default GraphQL error
		gqlErr := graphql.DefaultErrorPresenter(ctx, err)

		// Sanitize the error message
		sanitizedErr := SanitizeError(ctx, err)
		gqlErr.Message = sanitizedErr.Error()

		env := os.Getenv("ENVIRONMENT")
		isDevelopment := env == "development" || env == "test" || env == ""

		// In production, remove potentially sensitive information
		if !isDevelopment {
			// Remove extensions that might contain sensitive data
			gqlErr.Extensions = nil

			// Keep path for client-side error handling, but remove in strict mode
			if os.Getenv("ERROR_STRICT_MODE") == "true" {
				gqlErr.Path = nil
			}
		}

		// Skip logging for client-cancelled requests (context.Canceled means the
		// browser navigated away or unmounted a component mid-flight — not a real error).
		if errors.Is(err, context.Canceled) {
			return gqlErr
		}

		// Log all errors server-side for monitoring
		if gqlErr.Path != nil {
			log.Printf("[GraphQL Error] path=%v message=%s", gqlErr.Path, err.Error())
		} else {
			log.Printf("[GraphQL Error] message=%s", err.Error())
		}

		return gqlErr
	}
}

// RecoverFunc creates a panic recovery function for GraphQL.
// This prevents panics from crashing the server and leaking stack traces.
func RecoverFunc() graphql.RecoverFunc {
	return func(ctx context.Context, err interface{}) error {
		// Log the panic with full details
		log.Printf("[PANIC] %v", err)

		env := os.Getenv("ENVIRONMENT")
		isDevelopment := env == "development" || env == "test" || env == ""

		// Return appropriate error message
		if isDevelopment {
			return fmt.Errorf("internal panic: %v", err)
		}

		return errors.New("an unexpected error occurred")
	}
}
