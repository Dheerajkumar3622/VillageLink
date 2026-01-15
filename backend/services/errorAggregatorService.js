/**
 * Error Aggregator Service
 * 
 * Backend service that:
 * - Receives and stores error reports from clients
 * - Aggregates similar errors using fingerprinting
 * - Provides analytics and insights
 * - Triggers alerts for critical issues
 * - Powers the admin error dashboard
 */

import ErrorLog from '../models/ErrorLog.js';
import crypto from 'crypto';

// --- CONFIGURATION ---

const CONFIG = {
    CRITICAL_THRESHOLD: 10,  // Critical errors per hour to trigger alert
    AGGREGATION_WINDOW: 60 * 60 * 1000, // 1 hour in ms
    MAX_ERRORS_PER_USER_HOUR: 50, // Rate limiting
    AUTO_RESOLVE_AFTER_DAYS: 30
};

// In-memory rate limiting
const rateLimitMap = new Map();

// --- UTILITIES ---

/**
 * Create a fingerprint for error deduplication
 */
function createFingerprint(error) {
    const str = `${error.type}:${error.message?.substring(0, 100)}:${error.component || ''}:${error.code || ''}`;
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 16);
}

/**
 * Check rate limit for user
 */
function checkRateLimit(userId) {
    if (!userId) return true;

    const key = `${userId}:${Math.floor(Date.now() / (60 * 60 * 1000))}`;
    const count = rateLimitMap.get(key) || 0;

    if (count >= CONFIG.MAX_ERRORS_PER_USER_HOUR) {
        return false;
    }

    rateLimitMap.set(key, count + 1);

    // Clean old entries
    if (rateLimitMap.size > 10000) {
        const oldKeys = [];
        const currentHour = Math.floor(Date.now() / (60 * 60 * 1000));
        for (const [k] of rateLimitMap) {
            const [, hour] = k.split(':');
            if (parseInt(hour) < currentHour - 1) {
                oldKeys.push(k);
            }
        }
        oldKeys.forEach(k => rateLimitMap.delete(k));
    }

    return true;
}

// --- CORE FUNCTIONS ---

/**
 * Store a batch of errors
 */
export async function storeErrors(errors) {
    const results = {
        stored: 0,
        aggregated: 0,
        rateLimited: 0,
        errors: []
    };

    for (const error of errors) {
        try {
            // Rate limiting
            if (!checkRateLimit(error.userId)) {
                results.rateLimited++;
                continue;
            }

            // Create fingerprint
            const fingerprint = createFingerprint(error);

            // Check for existing error with same fingerprint in last hour
            const existingError = await ErrorLog.findOne({
                fingerprint,
                createdAt: { $gte: new Date(Date.now() - CONFIG.AGGREGATION_WINDOW) }
            });

            if (existingError) {
                // Aggregate: increment count
                await ErrorLog.updateOne(
                    { _id: existingError._id },
                    {
                        $inc: { occurrenceCount: 1 },
                        $set: { updatedAt: new Date() }
                    }
                );
                results.aggregated++;
            } else {
                // Create new error log
                await ErrorLog.create({
                    ...error,
                    fingerprint,
                    createdAt: error.timestamp ? new Date(error.timestamp) : new Date()
                });
                results.stored++;
            }
        } catch (err) {
            results.errors.push({ errorId: error.errorId, reason: err.message });
        }
    }

    // Check for alert conditions
    await checkAlertConditions();

    return results;
}

/**
 * Check if we need to trigger alerts
 */
async function checkAlertConditions() {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const criticalCount = await ErrorLog.countDocuments({
        severity: 'CRITICAL',
        createdAt: { $gte: hourAgo },
        resolved: false
    });

    if (criticalCount >= CONFIG.CRITICAL_THRESHOLD) {
        // TODO: Send alert (email, SMS, push notification)
        console.error(`[ALERT] ${criticalCount} critical errors in the last hour!`);
    }
}

/**
 * Get error analytics
 */
export async function getErrorAnalytics(options = {}) {
    const { days = 7, type = null, severity = null } = options;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const matchStage = { createdAt: { $gte: startDate } };
    if (type) matchStage.type = type;
    if (severity) matchStage.severity = severity;

    const [summary, byType, bySeverity, trend, topErrors, affectedUsers] = await Promise.all([
        // Summary counts
        ErrorLog.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$occurrenceCount' },
                    unique: { $sum: 1 },
                    resolved: { $sum: { $cond: ['$resolved', 1, 0] } }
                }
            }
        ]),

        // By type
        ErrorLog.aggregate([
            { $match: matchStage },
            { $group: { _id: '$type', count: { $sum: '$occurrenceCount' } } },
            { $sort: { count: -1 } }
        ]),

        // By severity
        ErrorLog.aggregate([
            { $match: matchStage },
            { $group: { _id: '$severity', count: { $sum: '$occurrenceCount' } } }
        ]),

        // Daily trend
        ErrorLog.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: '$occurrenceCount' }
                }
            },
            { $sort: { _id: 1 } }
        ]),

        // Top recurring errors
        ErrorLog.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$fingerprint',
                    count: { $sum: '$occurrenceCount' },
                    message: { $first: '$message' },
                    type: { $first: '$type' },
                    severity: { $first: '$severity' },
                    lastSeen: { $max: '$createdAt' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]),

        // Most affected users
        ErrorLog.aggregate([
            { $match: { ...matchStage, userId: { $ne: null } } },
            {
                $group: {
                    _id: '$userId',
                    count: { $sum: '$occurrenceCount' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ])
    ]);

    return {
        summary: summary[0] || { total: 0, unique: 0, resolved: 0 },
        byType,
        bySeverity,
        trend,
        topErrors,
        affectedUsers
    };
}

/**
 * Get recent errors
 */
export async function getRecentErrors(options = {}) {
    const { limit = 50, type = null, severity = null, resolved = null } = options;

    const query = {};
    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (resolved !== null) query.resolved = resolved;

    return ErrorLog.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
}

/**
 * Get error by ID
 */
export async function getErrorById(errorId) {
    return ErrorLog.findOne({ errorId }).lean();
}

/**
 * Mark error as resolved
 */
export async function resolveError(errorId, resolvedBy, resolution) {
    return ErrorLog.updateOne(
        { errorId },
        {
            $set: {
                resolved: true,
                resolvedBy,
                resolvedAt: new Date(),
                resolution,
                updatedAt: new Date()
            }
        }
    );
}

/**
 * Bulk resolve errors by fingerprint
 */
export async function resolveByFingerprint(fingerprint, resolvedBy, resolution) {
    return ErrorLog.updateMany(
        { fingerprint, resolved: false },
        {
            $set: {
                resolved: true,
                resolvedBy,
                resolvedAt: new Date(),
                resolution,
                updatedAt: new Date()
            }
        }
    );
}

/**
 * Auto-resolve old errors
 */
export async function autoResolveOldErrors() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.AUTO_RESOLVE_AFTER_DAYS);

    const result = await ErrorLog.updateMany(
        { resolved: false, createdAt: { $lt: cutoffDate } },
        {
            $set: {
                resolved: true,
                resolvedBy: 'SYSTEM_AUTO',
                resolvedAt: new Date(),
                resolution: `Auto-resolved after ${CONFIG.AUTO_RESOLVE_AFTER_DAYS} days`
            }
        }
    );

    return result.modifiedCount;
}

/**
 * Cleanup old error logs
 */
export async function cleanupOldLogs(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await ErrorLog.deleteMany({
        createdAt: { $lt: cutoffDate }
    });

    return result.deletedCount;
}

/**
 * Get device statistics
 */
export async function getDeviceStats(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [byBrowser, byOS, byConnection] = await Promise.all([
        ErrorLog.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$deviceInfo.browser', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        ErrorLog.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$deviceInfo.os', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        ErrorLog.aggregate([
            { $match: { createdAt: { $gte: startDate }, 'deviceInfo.effectiveType': { $ne: null } } },
            { $group: { _id: '$deviceInfo.effectiveType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ])
    ]);

    return { byBrowser, byOS, byConnection };
}

// Default export
export default {
    storeErrors,
    getErrorAnalytics,
    getRecentErrors,
    getErrorById,
    resolveError,
    resolveByFingerprint,
    autoResolveOldErrors,
    cleanupOldLogs,
    getDeviceStats
};
