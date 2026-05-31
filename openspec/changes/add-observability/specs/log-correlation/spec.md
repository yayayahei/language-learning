## ADDED Requirements

### Requirement: Structured JSON logging with trace context
The system SHALL emit all logs as structured JSON via `slog`. Every log line produced within an HTTP request context MUST include `trace_id` and `span_id` fields automatically, without requiring handler code to pass them explicitly.

#### Scenario: Request log includes trace context
- **WHEN** any handler within an HTTP request calls `slog.Info("processing", ...)`
- **THEN** the JSON log output includes `trace_id` and `span_id` fields matching the current request's trace

#### Scenario: Log outside request context has no trace fields
- **WHEN** `slog.Info` is called outside an HTTP request context (e.g., startup)
- **THEN** the JSON log output does NOT include `trace_id` or `span_id` fields

### Requirement: Request-scoped log fields
The system SHALL log method, path, status code, duration, and remote address on every completed HTTP request.

#### Scenario: Request log line
- **WHEN** a GET request to `/api/health` completes with status 200 in 5ms from `127.0.0.1:54321`
- **THEN** a JSON log line is emitted with fields `method=GET`, `path=/api/health`, `status=200`, `duration_ms=5`, `remote_addr=127.0.0.1:54321`

### Requirement: OTel slog bridge
The system SHALL use the OpenTelemetry slog bridge (`otelslog`) to connect OTel span context to `slog` records. This replaces the hand-rolled `LogAttrs` helper and context-value-based trace ID propagation.

#### Scenario: Bridge auto-injects span context
- **WHEN** a handler uses `slog.InfoContext(ctx, "message")`
- **THEN** the log record automatically includes `trace_id` and `span_id` from the active OTel span in `ctx`, without manual attribute passing
