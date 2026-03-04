package analytics

import (
	"log"
	"os"
	"sync"

	"github.com/posthog/posthog-go"
)

var (
	client     posthog.Client
	clientOnce sync.Once
)

// Client returns the singleton PostHog client, initialised on first call.
// Returns nil if POSTHOG_KEY is not set — all Capture calls are no-ops.
func Client() posthog.Client {
	clientOnce.Do(func() {
		key := os.Getenv("POSTHOG_KEY")
		if key == "" {
			return
		}
		c, err := posthog.NewWithConfig(key, posthog.Config{
			Endpoint: "https://eu.i.posthog.com",
		})
		if err != nil {
			log.Printf("analytics: failed to init posthog client: %v", err)
			return
		}
		client = c
	})
	return client
}

// Capture sends a server-side event to PostHog.
// distinctID should be the user's UUID string, or an anonymous ID for unauthenticated actions.
// Safe to call even if PostHog is not configured — it's a no-op.
func Capture(distinctID, event string, properties posthog.Properties) {
	c := Client()
	if c == nil {
		return
	}
	if err := c.Enqueue(posthog.Capture{
		DistinctId: distinctID,
		Event:      event,
		Properties: properties,
	}); err != nil {
		log.Printf("analytics: capture %q for %q failed: %v", event, distinctID, err)
	}
}

// Shutdown flushes buffered events and closes the client.
// Call this from the application shutdown hook.
func Shutdown() {
	if client != nil {
		if err := client.Close(); err != nil {
			log.Printf("analytics: shutdown error: %v", err)
		}
	}
}
