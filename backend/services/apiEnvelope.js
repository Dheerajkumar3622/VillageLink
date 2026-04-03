import crypto from 'crypto';

export const API_VERSION = 'v1';

export function ok(res, data, meta = {}) {
    return res.json({
        success: true,
        version: API_VERSION,
        traceId: meta.traceId || res.getHeader('x-trace-id') || crypto.randomBytes(8).toString('hex'),
        data,
        meta: { ...meta, timestamp: Date.now() }
    });
}

export function fail(res, status, code, message, extra = {}) {
    const traceId = extra.traceId || res.getHeader('x-trace-id') || crypto.randomBytes(8).toString('hex');
    return res.status(status).json({
        success: false,
        version: API_VERSION,
        traceId,
        error: {
            code,
            message,
            retryable: !!extra.retryable
        },
        ...extra
    });
}

export function traceMiddleware(req, res, next) {
    const tid = req.headers['x-trace-id'] || crypto.randomBytes(8).toString('hex');
    res.setHeader('x-trace-id', tid);
    req.traceId = tid;
    next();
}
