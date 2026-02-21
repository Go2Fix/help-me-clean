// Package handler is the Vercel serverless function entrypoint.
// The package name must be "handler" and the exported function must be named "Handler".
package handler

import (
	"context"
	"log"
	"net/http"
	"sync"

	"go2fix-backend/app"
)

var (
	once        sync.Once
	httpHandler http.Handler
	initErr     error
)

// Handler is the Vercel Go serverless function entrypoint.
// sync.Once ensures initialization runs only on cold start; warm invocations reuse the handler.
func Handler(w http.ResponseWriter, r *http.Request) {
	once.Do(func() {
		h, _, err := app.NewHandler(context.Background())
		if err != nil {
			log.Printf("FATAL: failed to initialize handler: %v", err)
			initErr = err
			return
		}
		httpHandler = h
	})

	if initErr != nil || httpHandler == nil {
		http.Error(w, `{"error":"service initialization failed"}`, http.StatusInternalServerError)
		return
	}

	httpHandler.ServeHTTP(w, r)
}
