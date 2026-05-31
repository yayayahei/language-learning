## Why

The backend has no structured observability beyond chi's text-based request logger and simple atomic counters. When requests fail or latency spikes, there's no way to trace a request end-to-end, correlate logs with errors, or understand performance distributions. OpenTelemetry gives us industry-standard logs, traces, and metrics with minimal code changes.

## What Changes

- Replace chi's `middleware.Logger` with an OpenTelemetry-based observability middleware that emits structured JSON logs, distributed traces, and HTTP metrics
- Add OTLP trace export so traces can be shipped to any observability backend (Jaeger, Grafana Tempo, Honeycomb, etc.)
- Add OTLP metrics export for request rate, latency histograms, and error counts
- Correlate logs with traces via `trace_id` and `span_id` in structured log output
- Retain the existing `/api/metrics` endpoint and extend it with latency percentiles
- Remove the hand-rolled atomic counter middleware and the chi `middleware.Logger` dependency

## Capabilities

### New Capabilities

- `http-tracing`: Every HTTP request gets a trace span. Traces propagate via W3C trace context headers. Spans include method, path, status code, and duration. Exported via OTLP when an exporter is configured.
- `http-metrics`: Request duration histogram, request count, and error count exported as OTLP metrics. An optional Prometheus `/api/metrics` endpoint provides local introspection without an OTLP collector.
- `log-correlation`: Structured JSON logs include `trace_id` and `span_id` on every log line within a request context. All existing `slog.Info`/`slog.Error` calls automatically inherit these fields.

### Modified Capabilities

None — no existing specs to modify.

## Impact

- **Dependencies**: Add `go.opentelemetry.io/otel`, `go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp`, `go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp`, `go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp`
- **Code**: `backend/observability/` package rewritten with OTel SDK; `backend/main.go` middleware chain updated; remove chi `middleware.Logger`
- **Config**: New optional env vars `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME` (default: `language-learning`)
- **API**: `/api/metrics` endpoint enhanced; trace context headers on all responses
