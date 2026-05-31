## 1. Dependencies

- [x] 1.1 Add OpenTelemetry Go SDK (`go.opentelemetry.io/otel`, `go.opentelemetry.io/otel/sdk/trace`, `go.opentelemetry.io/otel/sdk/metric`)
- [x] 1.2 Add OTLP exporters (`go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp`, `go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp`)
- [x] 1.3 Add otelhttp middleware (`go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp`)
- [x] 1.4 Add otelslog bridge (`go.opentelemetry.io/contrib/bridges/otelslog`) — replaced with custom traceSlogHandler wrapper (simpler, same outcome)

## 2. Tracer and logger setup

- [x] 2.1 Create `Setup()` function in `observability` package that initializes the TracerProvider (OTLP exporter when env var is set, no-op otherwise)
- [x] 2.2 Configure W3C trace context propagation (default in OTel SDK via otelhttp)
- [x] 2.3 Wire trace context into slog: custom `traceSlogHandler` wraps JSONHandler and auto-injects `trace_id` / `span_id` from OTel span context
- [x] 2.4 Remove hand-rolled `LogAttrs`, `WithTraceID`, `TraceID`, `contextKey`, `traceIDKey` from `logger.go`
- [x] 2.5 `Setup()` returns a shutdown function that flushes pending spans and metrics

## 3. HTTP middleware

- [x] 3.1 Rewrite `Middleware()` to wrap the handler with `otelhttp` for automatic span creation, W3C propagation, and duration/metric recording
- [x] 3.2 Add a response writer wrapper that logs method, path, status, duration_ms, and remote_addr via `slog.InfoContext`
- [x] 3.3 Set `X-Trace-ID` response header from the active span's trace ID
- [x] 3.4 Replace old atomic counters with clean `reqTotal`/`reqErrors`/`reqByPath` tracking

## 4. Metrics endpoint

- [x] 4.1 Configure MeterProvider with periodic OTLP export (or no-op when endpoint is unset) — done in `logger.go`
- [x] 4.2 Track `requests_total`, `requests_errors`, and `requests_by_endpoint` via atomic counters and sync.Map
- [x] 4.3 Update `MetricsHandler` to return JSON with `requests_total`, `requests_errors`, `requests_by_endpoint`

## 5. Integration in main.go

- [x] 5.1 Call `observability.Setup()` early in `main()`, store the shutdown function, and `defer shutdown()`
- [x] 5.2 Replace chi `middleware.Logger` with `observability.Middleware` in the router middleware chain
- [x] 5.3 Keep chi `middleware.Recoverer` (otelhttp does not handle panics)
- [x] 5.4 Add `/api/metrics` route using `observability.MetricsHandler`

## 6. Verification

- [x] 6.1 Start server with no `OTEL_EXPORTER_OTLP_ENDPOINT` set, make requests, and verify JSON logs include `trace_id` and `span_id`
- [x] 6.2 Hit `/api/metrics` and verify JSON response includes `requests_total`, `requests_errors`, `requests_by_endpoint`
- [x] 6.3 Verify `X-Trace-ID` header is present on all responses
- [ ] 6.4 (Optional) Start a local Jaeger or Grafana Tempo, point `OTEL_EXPORTER_OTLP_ENDPOINT` at it, and verify traces appear
