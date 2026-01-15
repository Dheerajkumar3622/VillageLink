import mongoose from 'mongoose';

/**
 * ErrorLog Schema
 * Stores all application errors, performance issues, and UX problems
 * for automatic analysis and resolution
 */

const ErrorLogSchema = new mongoose.Schema({
    // Unique error identifier
    errorId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Error classification
    type: {
        type: String,
        enum: ['CLIENT_ERROR', 'SERVER_ERROR', 'NETWORK_ERROR', 'PERFORMANCE', 'UX_ISSUE', 'SERVICE_FAILURE'],
        required: true,
        index: true
    },

    // Severity level
    severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'MEDIUM',
        index: true
    },

    // Error details
    message: {
        type: String,
        required: true
    },
    stack: String,
    code: String,

    // Location info
    url: String,
    component: String,
    action: String,

    // User context
    userId: {
        type: String,
        index: true
    },
    sessionId: String,

    // Device & environment info
    deviceInfo: {
        browser: String,
        browserVersion: String,
        os: String,
        osVersion: String,
        screenWidth: Number,
        screenHeight: Number,
        connectionType: String,
        effectiveType: String,
        language: String,
        timezone: String
    },

    // Performance metrics
    performanceMetrics: {
        latency: Number,          // API response time in ms
        loadTime: Number,         // Page load time in ms
        fps: Number,              // Frames per second
        memoryUsage: Number,      // Memory in MB
        cpuUsage: Number          // CPU percentage
    },

    // Network info for network errors
    networkInfo: {
        endpoint: String,
        method: String,
        statusCode: Number,
        responseTime: Number,
        requestSize: Number,
        responseSize: Number
    },

    // UX metrics
    uxMetrics: {
        rageClicks: Number,       // Rapid repeated clicks
        deadClicks: Number,       // Clicks with no response
        formAbandonment: Boolean,
        scrollDepth: Number,
        timeOnPage: Number,
        idleTime: Number
    },

    // Additional context
    context: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Error grouping (for aggregation)
    fingerprint: {
        type: String,
        index: true
    },
    occurrenceCount: {
        type: Number,
        default: 1
    },

    // Resolution tracking
    resolved: {
        type: Boolean,
        default: false,
        index: true
    },
    resolvedBy: String,
    resolvedAt: Date,
    resolution: String,

    // Auto-fix tracking
    autoFixAttempted: {
        type: Boolean,
        default: false
    },
    autoFixSuccessful: Boolean,
    autoFixAction: String,

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound indexes for common queries
ErrorLogSchema.index({ type: 1, severity: 1, createdAt: -1 });
ErrorLogSchema.index({ resolved: 1, severity: 1 });
ErrorLogSchema.index({ fingerprint: 1, createdAt: -1 });

// Static method to create error fingerprint
ErrorLogSchema.statics.createFingerprint = function (error) {
    const str = `${error.type}:${error.message}:${error.component || ''}:${error.code || ''}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
};

// Static method to get error analytics
ErrorLogSchema.statics.getAnalytics = async function (days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [byType, bySeverity, trend, topErrors] = await Promise.all([
        // Errors by type
        this.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        // Errors by severity
        this.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$severity', count: { $sum: 1 } } }
        ]),
        // Daily trend
        this.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),
        // Top recurring errors
        this.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$fingerprint', count: { $sum: 1 }, message: { $first: '$message' }, type: { $first: '$type' } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ])
    ]);

    return { byType, bySeverity, trend, topErrors };
};

const ErrorLog = mongoose.model('ErrorLog', ErrorLogSchema);

export default ErrorLog;
