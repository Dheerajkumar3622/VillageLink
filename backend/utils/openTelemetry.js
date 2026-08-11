import crypto from 'crypto';

/**
 * OpenTelemetry Distributed Tracing Helper
 * Formulates span hierarchies, tracking nested transaction timelines.
 */

/**
 * Generates a standard W3C trace parent compatible 16-byte random trace ID
 */
export const generateTraceId = () => {
    return crypto.randomBytes(16).toString('hex'); // 32 hex chars
};

/**
 * Generates a standard 8-byte random span ID
 */
export const generateSpanId = () => {
    return crypto.randomBytes(8).toString('hex'); // 16 hex chars
};

/**
 * Starts a tracing span context record
 */
export const startActiveSpan = (name, traceId = null, parentSpanId = null) => {
    return {
        name,
        traceId: traceId || generateTraceId(),
        spanId: generateSpanId(),
        parentSpanId: parentSpanId || null,
        startTime: Date.now()
    };
};

/**
 * Ends span execution and logs correlation telemetry records
 */
export const endActiveSpan = (span, attributes = {}) => {
    const endTime = Date.now();
    const durationMs = endTime - span.startTime;

    const spanTraceLog = {
        name: span.name,
        traceId: span.traceId,
        spanId: span.spanId,
        parentSpanId: span.parentSpanId,
        durationMs,
        attributes
    };

    console.log(`   [TelemetryTrace] Span: "${span.name}" | TraceID: ${span.traceId} | SpanID: ${span.spanId} | ParentID: ${span.parentSpanId || 'none'} | Duration: ${durationMs}ms`);
    return spanTraceLog;
};
