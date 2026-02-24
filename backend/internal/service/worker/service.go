package worker

import (
	"context"
	"log"
)

// Service handles worker business logic.
type Service struct {
	// db will be injected
}

// NewService creates a new worker service.
func NewService() *Service {
	return &Service{}
}

// Init initializes the worker service.
func (s *Service) Init() {
	log.Println("Worker service initialized")
}

// Ping is a placeholder for future implementation.
func (s *Service) Ping(ctx context.Context) string {
	return "worker service: ok"
}
