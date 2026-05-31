## ADDED Requirements

### Requirement: Request duration is recorded as a histogram
The system SHALL record the duration of every HTTP request as an OpenTelemetry histogram metric with buckets suitable for HTTP latency analysis (50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s). The histogram MUST include labels for HTTP method, route, and status code.

#### Scenario: Latency recorded for successful request
- **WHEN** a GET request to `/api/health` completes in 12ms
- **THEN** the `http.server.duration` histogram records an observation in the 50ms bucket with labels `method=GET`, `route=/api/health`, `status=200`

#### Scenario: Latency recorded for error request
- **WHEN** a POST request to `/api/login` returns 401 in 230ms
- **THEN** the `http.server.duration` histogram records an observation in the 250ms bucket with labels `method=POST`, `route=/api/login`, `status=401`

### Requirement: Request count is tracked
The system SHALL increment a counter metric for every HTTP request, labeled by method, route, and status code.

#### Scenario: Request counter increments
- **WHEN** three requests complete (two 200, one 404)
- **THEN** the `http.server.request_count` counter reads 3 total, with per-status breakdowns available via labels

### Requirement: Metrics export via OTLP when configured
The system SHALL export metrics via OTLP HTTP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. When the variable is absent, the system SHALL use a no-op metrics exporter (metrics are not exported but request handling is unaffected).

#### Scenario: Metrics export with OTLP endpoint
- **WHEN** `OTEL_EXPORTER_OTLP_ENDPOINT` is configured
- **THEN** metrics are exported periodically to the OTLP endpoint

#### Scenario: No metrics export without OTLP endpoint
- **WHEN** `OTEL_EXPORTER_OTLP_ENDPOINT` is not set
- **THEN** metrics export is disabled and request handling proceeds normally

### Requirement: Local metrics endpoint for introspection
The system SHALL expose a `/api/metrics` endpoint that returns current metrics in JSON format, including total request count, error count, and request count by endpoint.

#### Scenario: Metrics endpoint returns current data
- **WHEN** a client makes a GET request to `/api/metrics`
- **THEN** the response is JSON containing `requests_total`, `requests_errors`, and `requests_by_endpoint` with current values
