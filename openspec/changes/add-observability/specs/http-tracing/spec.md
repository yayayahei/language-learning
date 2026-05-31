## ADDED Requirements

### Requirement: Every HTTP request creates a trace span
The system SHALL create an OpenTelemetry span for every incoming HTTP request. The span MUST include the HTTP method, request path, response status code, and request duration.

#### Scenario: Successful request span
- **WHEN** a client makes a GET request to `/api/health`
- **THEN** a span is created with attributes `http.method=GET`, `http.route=/api/health`, `http.status_code=200`, and a duration in milliseconds

#### Scenario: Error request span
- **WHEN** a client makes a request that results in a 4xx or 5xx status
- **THEN** the span includes `http.status_code` matching the error and the span status is set to error

### Requirement: Traces propagate via W3C Trace Context
The system SHALL extract trace context from incoming `traceparent` and `tracestate` headers per the W3C Trace Context specification. If no trace context is present, the system SHALL start a new trace.

#### Scenario: Incoming trace propagation
- **WHEN** a client sends a request with a valid `traceparent` header
- **THEN** the request span is created as a child of the incoming trace

#### Scenario: New trace generation
- **WHEN** a client sends a request without a `traceparent` header
- **THEN** the system generates a new trace ID and span ID for the request

### Requirement: Trace IDs appear in response headers
The system SHALL include the trace ID in the response headers as `X-Trace-ID` on every HTTP response.

#### Scenario: Trace ID in response
- **WHEN** any HTTP request is processed
- **THEN** the response includes an `X-Trace-ID` header containing the trace ID for that request

### Requirement: Traces export via OTLP when configured
The system SHALL export spans via OTLP HTTP when the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable is set. When the variable is absent or empty, the system SHALL use a no-op exporter (traces are created but not exported).

#### Scenario: OTLP export configured
- **WHEN** `OTEL_EXPORTER_OTLP_ENDPOINT` is set to `http://localhost:4318`
- **THEN** spans are exported to that endpoint via OTLP HTTP

#### Scenario: No OTLP endpoint configured
- **WHEN** `OTEL_EXPORTER_OTLP_ENDPOINT` is not set
- **THEN** span export is disabled and request handling proceeds normally without errors
