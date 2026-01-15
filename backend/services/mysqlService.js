/**
 * MySQL Database Connection and Schemas
 * Used for specific relational data alongside MongoDB and PostgreSQL
 */

import mysql from 'mysql2/promise';

const MYSQL_URL = process.env.MYSQL_URL || process.env.MYSQL_DATABASE_URL;

let pool = null;

/**
 * Initialize MySQL connection pool
 */
export const initMySQL = async () => {
    if (!MYSQL_URL) {
        console.warn('⚠️ MySQL URL not configured, MySQL features disabled');
        return null;
    }

    try {
        pool = mysql.createPool({
            uri: MYSQL_URL,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        });

        // Test connection
        const connection = await pool.getConnection();
        console.log('✅ MySQL Connected');
        connection.release();

        // Initialize schemas
        await initSchemas();

        return pool;
    } catch (e) {
        console.error('❌ MySQL Connection Error:', e.message);
        return null;
    }
};

/**
 * Initialize MySQL schemas
 * Used for analytics, reports, and structured data
 */
const initSchemas = async () => {
    if (!pool) return;

    const schemas = [
        // Analytics events (high-volume, structured)
        `CREATE TABLE IF NOT EXISTS analytics_events (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            event_type VARCHAR(50) NOT NULL,
            user_id VARCHAR(50),
            session_id VARCHAR(100),
            properties JSON,
            device_info JSON,
            geo_location POINT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_event_type (event_type),
            INDEX idx_user_id (user_id),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB`,

        // Route statistics (aggregated)
        `CREATE TABLE IF NOT EXISTS route_statistics (
            id INT AUTO_INCREMENT PRIMARY KEY,
            route_id VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            total_bookings INT DEFAULT 0,
            total_revenue DECIMAL(12, 2) DEFAULT 0,
            avg_occupancy DECIMAL(5, 2) DEFAULT 0,
            peak_hour TINYINT,
            avg_fare DECIMAL(8, 2),
            unique_passengers INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_route_date (route_id, date),
            INDEX idx_date (date)
        ) ENGINE=InnoDB`,

        // Driver performance metrics
        `CREATE TABLE IF NOT EXISTS driver_metrics (
            id INT AUTO_INCREMENT PRIMARY KEY,
            driver_id VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            trips_completed INT DEFAULT 0,
            total_distance_km DECIMAL(10, 2) DEFAULT 0,
            total_earnings DECIMAL(10, 2) DEFAULT 0,
            avg_rating DECIMAL(3, 2),
            on_time_percentage DECIMAL(5, 2),
            acceptance_rate DECIMAL(5, 2),
            cancellation_rate DECIMAL(5, 2),
            online_hours DECIMAL(5, 2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_driver_date (driver_id, date),
            INDEX idx_driver_id (driver_id),
            INDEX idx_date (date)
        ) ENGINE=InnoDB`,

        // Food vendor analytics
        `CREATE TABLE IF NOT EXISTS vendor_analytics (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vendor_id VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            total_orders INT DEFAULT 0,
            total_revenue DECIMAL(10, 2) DEFAULT 0,
            avg_order_value DECIMAL(8, 2),
            avg_rating DECIMAL(3, 2),
            repeat_customers INT DEFAULT 0,
            peak_hour TINYINT,
            top_items JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_vendor_date (vendor_id, date)
        ) ENGINE=InnoDB`,

        // System audit logs
        `CREATE TABLE IF NOT EXISTS audit_logs (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            action VARCHAR(100) NOT NULL,
            actor_id VARCHAR(50),
            actor_type ENUM('USER', 'DRIVER', 'ADMIN', 'SYSTEM') DEFAULT 'SYSTEM',
            target_type VARCHAR(50),
            target_id VARCHAR(100),
            old_value JSON,
            new_value JSON,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_actor (actor_id),
            INDEX idx_target (target_type, target_id),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB`,

        // Marketing campaigns tracking
        `CREATE TABLE IF NOT EXISTS campaigns (
            id INT AUTO_INCREMENT PRIMARY KEY,
            campaign_name VARCHAR(100) NOT NULL,
            campaign_type ENUM('SMS', 'EMAIL', 'PUSH', 'IN_APP') NOT NULL,
            target_segment VARCHAR(50),
            content TEXT,
            start_date DATETIME,
            end_date DATETIME,
            budget DECIMAL(10, 2),
            spent DECIMAL(10, 2) DEFAULT 0,
            impressions INT DEFAULT 0,
            clicks INT DEFAULT 0,
            conversions INT DEFAULT 0,
            status ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED') DEFAULT 'DRAFT',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB`,

        // Referral tracking
        `CREATE TABLE IF NOT EXISTS referrals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            referrer_id VARCHAR(50) NOT NULL,
            referred_id VARCHAR(50) NOT NULL,
            referral_code VARCHAR(20) NOT NULL,
            status ENUM('PENDING', 'COMPLETED', 'EXPIRED', 'REWARDED') DEFAULT 'PENDING',
            reward_amount DECIMAL(8, 2),
            rewarded_at DATETIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_referrer (referrer_id),
            INDEX idx_referred (referred_id),
            INDEX idx_code (referral_code)
        ) ENGINE=InnoDB`
    ];

    for (const schema of schemas) {
        try {
            await pool.query(schema);
        } catch (e) {
            console.error('MySQL Schema Error:', e.message);
        }
    }

    console.log('✅ MySQL Schemas initialized');
};

// ==================== ANALYTICS OPERATIONS ====================

/**
 * Track analytics event
 */
export const trackEvent = async (eventType, userId, properties = {}, deviceInfo = {}) => {
    if (!pool) return null;

    try {
        const [result] = await pool.query(
            `INSERT INTO analytics_events (event_type, user_id, properties, device_info)
             VALUES (?, ?, ?, ?)`,
            [eventType, userId, JSON.stringify(properties), JSON.stringify(deviceInfo)]
        );
        return result.insertId;
    } catch (e) {
        console.error('Track event error:', e);
        return null;
    }
};

/**
 * Get event analytics for date range
 */
export const getEventAnalytics = async (eventType, startDate, endDate) => {
    if (!pool) return [];

    try {
        const [rows] = await pool.query(
            `SELECT 
                DATE(created_at) as date,
                COUNT(*) as count,
                COUNT(DISTINCT user_id) as unique_users
             FROM analytics_events
             WHERE event_type = ? AND created_at BETWEEN ? AND ?
             GROUP BY DATE(created_at)
             ORDER BY date`,
            [eventType, startDate, endDate]
        );
        return rows;
    } catch (e) {
        console.error('Analytics query error:', e);
        return [];
    }
};

// ==================== ROUTE STATISTICS ====================

/**
 * Update daily route statistics
 */
export const updateRouteStats = async (routeId, date, stats) => {
    if (!pool) return;

    try {
        await pool.query(
            `INSERT INTO route_statistics 
             (route_id, date, total_bookings, total_revenue, avg_occupancy, peak_hour, avg_fare, unique_passengers)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             total_bookings = total_bookings + VALUES(total_bookings),
             total_revenue = total_revenue + VALUES(total_revenue),
             avg_occupancy = (avg_occupancy + VALUES(avg_occupancy)) / 2,
             unique_passengers = GREATEST(unique_passengers, VALUES(unique_passengers))`,
            [routeId, date, stats.bookings || 0, stats.revenue || 0, stats.occupancy || 0,
                stats.peakHour, stats.avgFare || 0, stats.uniquePassengers || 0]
        );
    } catch (e) {
        console.error('Route stats update error:', e);
    }
};

/**
 * Get route performance report
 */
export const getRoutePerformance = async (routeId, days = 30) => {
    if (!pool) return [];

    try {
        const [rows] = await pool.query(
            `SELECT * FROM route_statistics
             WHERE route_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             ORDER BY date DESC`,
            [routeId, days]
        );
        return rows;
    } catch (e) {
        console.error('Route performance query error:', e);
        return [];
    }
};

// ==================== DRIVER METRICS ====================

/**
 * Update driver daily metrics
 */
export const updateDriverMetrics = async (driverId, date, metrics) => {
    if (!pool) return;

    try {
        await pool.query(
            `INSERT INTO driver_metrics 
             (driver_id, date, trips_completed, total_distance_km, total_earnings, 
              avg_rating, on_time_percentage, acceptance_rate, online_hours)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             trips_completed = trips_completed + VALUES(trips_completed),
             total_distance_km = total_distance_km + VALUES(total_distance_km),
             total_earnings = total_earnings + VALUES(total_earnings),
             avg_rating = (avg_rating + VALUES(avg_rating)) / 2,
             online_hours = online_hours + VALUES(online_hours)`,
            [driverId, date, metrics.trips || 0, metrics.distance || 0, metrics.earnings || 0,
                metrics.rating || 5, metrics.onTimePercent || 100, metrics.acceptanceRate || 100,
                metrics.onlineHours || 0]
        );
    } catch (e) {
        console.error('Driver metrics update error:', e);
    }
};

/**
 * Get driver leaderboard
 */
export const getDriverLeaderboard = async (metric = 'total_earnings', days = 7, limit = 10) => {
    if (!pool) return [];

    const validMetrics = ['total_earnings', 'trips_completed', 'avg_rating', 'total_distance_km'];
    if (!validMetrics.includes(metric)) {
        metric = 'total_earnings';
    }

    try {
        const [rows] = await pool.query(
            `SELECT 
                driver_id,
                SUM(trips_completed) as total_trips,
                SUM(total_earnings) as total_earnings,
                SUM(total_distance_km) as total_distance,
                AVG(avg_rating) as avg_rating,
                AVG(on_time_percentage) as on_time_percent
             FROM driver_metrics
             WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             GROUP BY driver_id
             ORDER BY ${metric} DESC
             LIMIT ?`,
            [days, limit]
        );
        return rows;
    } catch (e) {
        console.error('Leaderboard query error:', e);
        return [];
    }
};

// ==================== AUDIT LOGGING ====================

/**
 * Log audit action
 */
export const logAudit = async (action, actorId, actorType, targetType, targetId, oldValue = null, newValue = null, ipAddress = null) => {
    if (!pool) return;

    try {
        await pool.query(
            `INSERT INTO audit_logs 
             (action, actor_id, actor_type, target_type, target_id, old_value, new_value, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [action, actorId, actorType, targetType, targetId,
                oldValue ? JSON.stringify(oldValue) : null,
                newValue ? JSON.stringify(newValue) : null,
                ipAddress]
        );
    } catch (e) {
        console.error('Audit log error:', e);
    }
};

/**
 * Get audit trail for entity
 */
export const getAuditTrail = async (targetType, targetId, limit = 50) => {
    if (!pool) return [];

    try {
        const [rows] = await pool.query(
            `SELECT * FROM audit_logs
             WHERE target_type = ? AND target_id = ?
             ORDER BY created_at DESC
             LIMIT ?`,
            [targetType, targetId, limit]
        );
        return rows;
    } catch (e) {
        console.error('Audit trail query error:', e);
        return [];
    }
};

// ==================== REFERRAL SYSTEM ====================

/**
 * Create referral
 */
export const createReferral = async (referrerId, referredId, referralCode) => {
    if (!pool) return null;

    try {
        const [result] = await pool.query(
            `INSERT INTO referrals (referrer_id, referred_id, referral_code)
             VALUES (?, ?, ?)`,
            [referrerId, referredId, referralCode]
        );
        return result.insertId;
    } catch (e) {
        console.error('Referral create error:', e);
        return null;
    }
};

/**
 * Complete referral and mark for reward
 */
export const completeReferral = async (referredId, rewardAmount) => {
    if (!pool) return false;

    try {
        await pool.query(
            `UPDATE referrals
             SET status = 'COMPLETED', reward_amount = ?
             WHERE referred_id = ? AND status = 'PENDING'`,
            [rewardAmount, referredId]
        );
        return true;
    } catch (e) {
        console.error('Referral complete error:', e);
        return false;
    }
};

// ==================== EXPORT ====================

export default {
    initMySQL,
    trackEvent,
    getEventAnalytics,
    updateRouteStats,
    getRoutePerformance,
    updateDriverMetrics,
    getDriverLeaderboard,
    logAudit,
    getAuditTrail,
    createReferral,
    completeReferral
};
