// Package email is deprecated — all notification delivery now goes through
// the notification.Service dispatcher.
// This stub is retained only to avoid breaking any remaining build references
// during the transition period.
// TODO: remove this package once all call sites have been migrated.
package email

// Service is an empty stub kept for backward compatibility.
type Service struct{}

// NewService returns a no-op email service stub.
func NewService() *Service { return &Service{} }
