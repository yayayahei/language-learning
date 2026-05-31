package observability

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"os"

	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	promexporter "go.opentelemetry.io/otel/exporters/prometheus"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.opentelemetry.io/otel/trace"
)

var promHandler http.Handler

// PrometheusHandler returns an HTTP handler exposing OTel metrics in Prometheus format.
// Must be called after Setup().
func PrometheusHandler() http.Handler {
	if promHandler == nil {
		return http.NotFoundHandler()
	}
	return promHandler
}

// Setup initializes OpenTelemetry tracing, metrics, and structured JSON logging
// with automatic trace context correlation. Returns a shutdown function that
// flushes pending spans and metrics. If OTEL_EXPORTER_OTLP_ENDPOINT is unset,
// uses no-op exporters (graceful degradation).
func Setup(ctx context.Context) (shutdown func(), err error) {
	svcName := os.Getenv("OTEL_SERVICE_NAME")
	if svcName == "" {
		svcName = "language-learning"
	}

	res := resource.NewSchemaless(
		semconv.ServiceName(svcName),
	)

	tp, tpShutdown, err := newTracerProvider(ctx, res)
	if err != nil {
		return nil, err
	}
	otel.SetTracerProvider(tp)

	mp, promH, mpShutdown, err := newMeterProvider(ctx, res)
	if err != nil {
		slog.Warn("observability: failed to create MeterProvider, using no-op", "error", err)
		mp = sdkmetric.NewMeterProvider(sdkmetric.WithResource(res))
		mpShutdown = func() {}
	}
	otel.SetMeterProvider(mp)
	promHandler = promH

	// slog handler that auto-injects trace_id and span_id from OTel span context.
	// Writes JSON to both stdout and a file (for Promtail -> Loki).
	logPath := os.Getenv("LOG_FILE")
	if logPath == "" {
		logPath = "/tmp/ll-logs.jsonl"
	}
	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		slog.Warn("observability: failed to open log file, logging to stdout only", "error", err)
		logFile = nil
	}
	var logWriter io.Writer = os.Stdout
	if logFile != nil {
		logWriter = io.MultiWriter(os.Stdout, logFile)
	}

	slog.SetDefault(slog.New(newSlogHandler(logWriter, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	return func() {
		tpShutdown()
		mpShutdown()
		if logFile != nil {
			logFile.Close()
		}
	}, nil
}

func newTracerProvider(ctx context.Context, res *resource.Resource) (*sdktrace.TracerProvider, func(), error) {
	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint == "" {
		tp := sdktrace.NewTracerProvider(sdktrace.WithResource(res))
		return tp, func() { tp.Shutdown(ctx) }, nil
	}

	exp, err := otlptracehttp.New(ctx,
		otlptracehttp.WithEndpointURL(endpoint),
	)
	if err != nil {
		return nil, nil, err
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exp),
		sdktrace.WithResource(res),
	)
	return tp, func() { tp.Shutdown(ctx) }, nil
}

func newMeterProvider(ctx context.Context, res *resource.Resource) (*sdkmetric.MeterProvider, http.Handler, func(), error) {
	// Prometheus exporter for local /metrics endpoint (scraped by Prometheus server).
	promExp, err := promexporter.New()
	if err != nil {
		return nil, nil, nil, err
	}

	mp := sdkmetric.NewMeterProvider(
		sdkmetric.WithReader(promExp),
		sdkmetric.WithResource(res),
	)
	promH := promhttp.Handler()
	return mp, promH, func() { mp.Shutdown(ctx) }, nil
}

// newSlogHandler creates an slog.Handler that writes JSON to w and
// automatically injects trace_id and span_id from the active OTel span.
func newSlogHandler(w io.Writer, opts *slog.HandlerOptions) slog.Handler {
	return &traceSlogHandler{inner: slog.NewJSONHandler(w, opts)}
}

type traceSlogHandler struct {
	inner slog.Handler
}

func (h *traceSlogHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return h.inner.Enabled(ctx, level)
}

func (h *traceSlogHandler) Handle(ctx context.Context, r slog.Record) error {
	span := trace.SpanFromContext(ctx)
	if span.IsRecording() {
		sc := span.SpanContext()
		r.AddAttrs(
			slog.String("trace_id", sc.TraceID().String()),
			slog.String("span_id", sc.SpanID().String()),
		)
	}
	return h.inner.Handle(ctx, r)
}

func (h *traceSlogHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &traceSlogHandler{inner: h.inner.WithAttrs(attrs)}
}

func (h *traceSlogHandler) WithGroup(name string) slog.Handler {
	return &traceSlogHandler{inner: h.inner.WithGroup(name)}
}
