package middleware

import (
	"bufio"
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

// TelemetryLogger is a structured JSON request logger middleware.
// It replaces chi/middleware.Logger with a JSON-format log line per request.
// For GraphQL requests to /query, it extracts the operation name from the body.
func TelemetryLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		requestID := middleware.GetReqID(r.Context())

		// For GraphQL requests, peek at the body to extract the operation name
		// without consuming it (we restore it so the handler still sees the body).
		operationName := ""
		if r.Method == http.MethodPost && strings.HasPrefix(r.URL.Path, "/query") {
			operationName = extractGQLOperation(r)
		}

		// Wrap the ResponseWriter to capture status code.
		ww := &statusWriter{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(ww, r)

		durationMs := time.Since(start).Milliseconds()

		attrs := []slog.Attr{
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", ww.status),
			slog.Int64("duration_ms", durationMs),
			slog.String("request_id", requestID),
			slog.String("remote_addr", r.RemoteAddr),
		}
		if operationName != "" {
			attrs = append(attrs, slog.String("gql_operation", operationName))
		}

		level := slog.LevelInfo
		if ww.status >= 500 {
			level = slog.LevelError
		} else if ww.status >= 400 {
			level = slog.LevelWarn
		}

		slog.LogAttrs(r.Context(), level, "request", attrs...)
	})
}

// extractGQLOperation peeks at the request body to find the GraphQL operation name.
// It restores the body so downstream handlers still receive it.
func extractGQLOperation(r *http.Request) string {
	if r.Body == nil {
		return ""
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, 4096))
	if err != nil {
		return ""
	}
	r.Body = io.NopCloser(bytes.NewReader(body))

	var gqlReq struct {
		OperationName string `json:"operationName"`
	}
	if err := json.Unmarshal(body, &gqlReq); err != nil {
		return ""
	}
	return gqlReq.OperationName
}

// statusWriter wraps http.ResponseWriter to capture the HTTP status code.
type statusWriter struct {
	http.ResponseWriter
	status int
}

func (sw *statusWriter) WriteHeader(code int) {
	sw.status = code
	sw.ResponseWriter.WriteHeader(code)
}

// Hijack implements http.Hijacker for WebSocket upgrade support.
func (sw *statusWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	hj, ok := sw.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, http.ErrNotSupported
	}
	return hj.Hijack()
}
