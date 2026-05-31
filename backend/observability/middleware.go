package observability

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/trace"
)

var (
	reqTotal  uint64
	reqErrors uint64
	reqByPath sync.Map // map[string]*uint64
)

// Middleware wraps the handler with otelhttp for tracing, W3C trace context propagation,
// and automatic HTTP metrics recording. Logs every request as structured JSON with
// trace_id and span_id auto-injected. Sets X-Trace-ID on every response.
func Middleware(inner http.Handler) http.Handler {
	// otelhttp creates spans, propagates W3C trace context, and records metrics.
	// Our inner handler runs after the span is created, so we have access to the
	// OTel span context for header injection and logging.
	wrapped := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		atomic.AddUint64(&reqTotal, 1)

		path := r.URL.Path
		v, _ := reqByPath.LoadOrStore(path, new(uint64))
		atomic.AddUint64(v.(*uint64), 1)

		// Set X-Trace-ID header from the span otelhttp created.
		span := trace.SpanFromContext(r.Context())
		w.Header().Set("X-Trace-ID", span.SpanContext().TraceID().String())

		rw := &responseWriter{ResponseWriter: w, status: 200}
		inner.ServeHTTP(rw, r)

		duration := time.Since(start)
		if rw.status >= 400 {
			atomic.AddUint64(&reqErrors, 1)
		}

		// Structured request log — trace_id and span_id are auto-injected
		// by the slog handler wrapping JSONHandler.
		slog.InfoContext(r.Context(), "",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rw.status,
			"duration_ms", duration.Milliseconds(),
			"remote_addr", r.RemoteAddr,
		)
	})

	return otelhttp.NewHandler(wrapped, "http",
		otelhttp.WithSpanNameFormatter(func(_ string, r *http.Request) string {
			return r.Method + " " + r.URL.Path
		}),
	)
}

type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}

// MetricsHandler exposes current request metrics as JSON.
func MetricsHandler(w http.ResponseWriter, r *http.Request) {
	total := atomic.LoadUint64(&reqTotal)
	errors := atomic.LoadUint64(&reqErrors)

	byPath := make(map[string]uint64)
	reqByPath.Range(func(key, value interface{}) bool {
		byPath[key.(string)] = atomic.LoadUint64(value.(*uint64))
		return true
	})

	resp := struct {
		RequestsTotal      uint64            `json:"requests_total"`
		RequestsErrors     uint64            `json:"requests_errors"`
		RequestsByEndpoint map[string]uint64 `json:"requests_by_endpoint"`
	}{
		RequestsTotal:      total,
		RequestsErrors:     errors,
		RequestsByEndpoint: byPath,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
