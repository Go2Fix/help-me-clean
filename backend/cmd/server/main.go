package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"go2fix-backend/app"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	handler, shutdown, err := app.NewHandler(context.Background())
	if err != nil {
		log.Fatalf("Failed to initialize application: %v", err)
	}
	defer shutdown()

	log.Printf("Go2Fix backend starting on port %s", port)
	log.Printf("GraphQL playground: http://localhost:%s/graphql", port)
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
