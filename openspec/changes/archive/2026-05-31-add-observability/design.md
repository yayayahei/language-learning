## Context

The backend currently uses chi's `middleware.Logger` (text-based, unstructured) and a hand-rolled `observability` package with `slog` JSON logging, trace ID propagation via context, and atomic request counters. The existing setup is a good start but doesn't provide distributed traces, latency histograms, or log-trace correlation without manual plumbing. The project is a single Go binary serving a React SPA — no microservices, so distributed tracing is about future-proofing and debugging individual request flows.

## Goals / Non-Goals

**Goals:**
- Structured JSON logging with automatic `trace_id` and `span_id` on every log line in request context
- Distributed tracing via W3C Trace Context headers, exported as OTLP when a collector is configured
- HTTP metrics (request rate, latency histogram, error rate) via OTLP
- A local `/api/metrics` endpoint for introspection without requiring an OTLP collector
- Graceful degradation: everything works locally even with no collector configured
- Minimal code change in handlers — observability is transparent to business logic

**Non-Goals:**
- Instrumenting database queries or external API calls (just HTTP layer for now)
- Alerting or dashboards (OTLP export enables the user to wire up their own backend)
- Frontend observability (browser RUM)
- Replacing `slog` — we keep `slog` as the logging backend and bridge it into OTel

## Decisions

### 1. Use OpenTelemetry Go SDK + `otelhttp` middleware (over hand-rolled or chi-only)

**Why**: OTel is the CNCF standard. `otelhttp` wraps any `http.Handler` and gives us spans, metrics, and W3C propagation in one middleware. Chi middleware is text-only and not structured.

**Alternatives considered**:
- *Keep chi logger + add hand-rolled traces*: More code to maintain, less portable, no standard trace propagation.
- *Prometheus SDK directly*: Ties us to Prometheus; OTLP exports work with Prometheus, Grafana, Datadog, etc.
- *Use `otelgin`/`otelchi`*: The `otelchi` middleware exists for chi specifically but adds a dependency for minimal benefit over `otelhttp`, which works with any `http.Handler`.

### 2. OTel slog bridge for log correlation (over hand-rolled LogAttrs)

**Why**: `go.opentelemetry.io/otel/bridge/otelslog` connects OTel's span context to `slog` automatically. Every `slog.Info(ctx, ...)` call picks up `trace_id` and `span_id` from the context's active span — no need for our current `LogAttrs` helper.

**Alternatives considered**:
- *Keep hand-rolled LogAttrs*: Works but duplicates what the bridge does. Would need to manually extract span IDs.
- *Replace slog with OTel log SDK*: OTel's native log API is still maturing in Go. The bridge is the recommended path.

### 3. OTLP HTTP exporter with env-var configuration

**Why**: OTLP/HTTP is the most broadly supported protocol. Standard env vars (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`) follow OTel conventions.

**Alternatives considered**:
- *gRPC OTLP*: Slightly more performant but adds gRPC dependency. HTTP is simpler and sufficient for this scale.
- *Stdout exporter*: Debug-only, not useful for production.

### 4. Keep `/api/metrics` with OTel's `prometheus` exporter as optional local fallback

**Why**: The Prometheus exporter from `go.opentelemetry.io/otel/exporters/prometheus` lets us expose metrics on a `/api/metrics` endpoint without an OTLP collector. This is useful for local dev and simple deployments. When an OTLP endpoint is configured, metrics are also exported there.

### 5. Single `observability` package, init in `main()`

**Why**: A centralized init function (`Setup()`) returns a shutdown function and wraps the handler. No global state beyond OTel's global tracer/meter providers (which is OTel convention).

```
observability.Setup(ctx) → (shutdown func(), handler http.Handler)
```

## Risks / Trade-offs

- **OTel SDK adds ~10 dependencies to go.mod**: Acceptable — these are well-maintained CNCF libraries.
- **No-op when collector is down**: OTel exporters retry by default; if the collector is unreachable, traces and metrics are dropped without affecting request handling.
- **`otelhttp` path patterns**: `otelhttp` uses the registered route pattern, not the raw URL. For chi, this means wrapping at the router level gives us `/api/health` rather than the actual path. This is correct for metrics cardinality but worth noting.
- **Memory overhead**: OTel SDK allocates per-request spans. With the default batch exporter, memory is bounded. For a single-user language learning app, this is negligible.
