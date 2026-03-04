package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(ctx context.Context) (*pgxpool.Pool, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse DATABASE_URL: %w", err)
	}

	// Use simple protocol to avoid prepared statement caching issues
	// with Neon serverless PostgreSQL after schema changes (e.g. enum alterations).
	config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	// Serverless-appropriate pool settings (one pool per function instance via sync.Once).
	// MinConns=0: don't pre-create connections — serverless instances can be frozen/killed.
	config.MaxConns = 5
	config.MinConns = 0
	config.MaxConnIdleTime = 2 * time.Minute
	config.HealthCheckPeriod = 30 * time.Second

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	log.Println("Database connection pool established")
	return pool, nil
}
