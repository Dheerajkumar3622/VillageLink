/**
 * Redis Caching Service
 * High-performance caching layer for VillageLink
 */

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redis;

try {
    redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        lazyConnect: true
    });

    redis.on('connect', () => console.log('✅ Redis Connected'));
    redis.on('error', (err) => console.error('❌ Redis Error:', err.message));
} catch (e) {
    console.warn('⚠️ Redis not available, using in-memory fallback');
    redis = null;
}

// In-memory fallback cache
const memoryCache = new Map();

// ==================== CACHE TTL CONFIGURATIONS ====================

export const CACHE_TTL = {
    DRIVER_LOCATION: 5,           // 5 seconds - real-time
    USER_SESSION: 3600,           // 1 hour
    MANDI_PRICES: 21600,          // 6 hours
    ROUTE_CALCULATION: 300,       // 5 minutes
    TRAFFIC_DATA: 60,             // 1 minute
    SEARCH_RESULTS: 600,          // 10 minutes
    FREQUENTLY_ACCESSED: 1800,    // 30 minutes
    STATIC_DATA: 86400,           // 24 hours
};

// ==================== CORE CACHE FUNCTIONS ====================

/**
 * Get value from cache
 */
export const get = async (key) => {
    if (redis) {
        const value = await redis.get(key);
        return value ? JSON.parse(value) : null;
    }
    return memoryCache.get(key) || null;
};

/**
 * Set value in cache with TTL
 */
export const set = async (key, value, ttl = 300) => {
    const serialized = JSON.stringify(value);

    if (redis) {
        await redis.setex(key, ttl, serialized);
    } else {
        memoryCache.set(key, value);
        // Memory cleanup after TTL
        setTimeout(() => memoryCache.delete(key), ttl * 1000);
    }
};

/**
 * Delete key from cache
 */
export const del = async (key) => {
    if (redis) {
        await redis.del(key);
    } else {
        memoryCache.delete(key);
    }
};

/**
 * Cache wrapper - try cache first, then fetch
 */
export const cacheWrapper = async (key, fetchFn, ttl = 300) => {
    // Try cache first
    const cached = await get(key);
    if (cached !== null) {
        console.log(`🎯 Cache HIT: ${key}`);
        return cached;
    }

    // Cache miss - fetch and store
    console.log(`⚡ Cache MISS: ${key}`);
    const data = await fetchFn();
    await set(key, data, ttl);
    return data;
};

// ==================== DRIVER LOCATION CACHE (HIGH FREQUENCY) ====================

/**
 * Cache driver location with geospatial indexing
 */
export const cacheDriverLocation = async (driverId, location) => {
    const key = `driver:location:${driverId}`;

    if (redis) {
        // Store location data
        await redis.setex(key, CACHE_TTL.DRIVER_LOCATION, JSON.stringify(location));

        // Add to geospatial index for radius queries
        await redis.geoadd('drivers:online', location.lng, location.lat, driverId);

        // Set online status with TTL
        await redis.setex(`driver:status:${driverId}`, 30, 'online');
    } else {
        memoryCache.set(key, location);
    }
};

/**
 * Get driver location
 */
export const getDriverLocation = async (driverId) => {
    return await get(`driver:location:${driverId}`);
};

/**
 * Find nearby drivers using Redis geospatial
 */
export const getNearbyDrivers = async (lat, lng, radiusKm = 5) => {
    if (!redis) {
        console.warn('Geospatial queries require Redis');
        return [];
    }

    try {
        const results = await redis.georadius(
            'drivers:online',
            lng,
            lat,
            radiusKm,
            'km',
            'WITHDIST',
            'WITHCOORD',
            'ASC',
            'COUNT',
            20
        );

        // Filter to only online drivers and enrich with location data
        const drivers = await Promise.all(
            results.map(async ([driverId, distance, coords]) => {
                const isOnline = await redis.get(`driver:status:${driverId}`);
                if (!isOnline) return null;

                const locationData = await getDriverLocation(driverId);
                return {
                    driverId,
                    distance: parseFloat(distance),
                    location: {
                        lat: parseFloat(coords[1]),
                        lng: parseFloat(coords[0])
                    },
                    ...locationData
                };
            })
        );

        return drivers.filter(d => d !== null);
    } catch (e) {
        console.error('Geospatial query error:', e);
        return [];
    }
};

/**
 * Remove driver from online index
 */
export const removeDriverFromIndex = async (driverId) => {
    if (redis) {
        await redis.zrem('drivers:online', driverId);
        await redis.del(`driver:status:${driverId}`);
        await redis.del(`driver:location:${driverId}`);
    }
};

// ==================== SESSION CACHE ====================

/**
 * Cache user session
 */
export const cacheSession = async (sessionId, userData) => {
    await set(`session:${sessionId}`, userData, CACHE_TTL.USER_SESSION);
};

/**
 * Get user session
 */
export const getSession = async (sessionId) => {
    return await get(`session:${sessionId}`);
};

/**
 * Invalidate user session
 */
export const invalidateSession = async (sessionId) => {
    await del(`session:${sessionId}`);
};

// ==================== ROUTE CACHE ====================

/**
 * Cache route calculation
 */
export const cacheRoute = async (from, to, routeData) => {
    const key = `route:${from}:${to}`;
    await set(key, routeData, CACHE_TTL.ROUTE_CALCULATION);
};

/**
 * Get cached route
 */
export const getCachedRoute = async (from, to) => {
    return await get(`route:${from}:${to}`);
};

// ==================== MARKET PRICES CACHE ====================

/**
 * Cache mandi prices
 */
export const cacheMandiPrices = async (prices) => {
    await set('mandi:prices', prices, CACHE_TTL.MANDI_PRICES);
};

/**
 * Get cached mandi prices
 */
export const getCachedMandiPrices = async () => {
    return await get('mandi:prices');
};

// ==================== RATE LIMITING ====================

/**
 * Rate limiter using Redis
 */
export const checkRateLimit = async (identifier, maxRequests = 100, windowSeconds = 60) => {
    if (!redis) return { allowed: true };

    const key = `ratelimit:${identifier}`;
    const current = await redis.incr(key);

    if (current === 1) {
        await redis.expire(key, windowSeconds);
    }

    return {
        allowed: current <= maxRequests,
        remaining: Math.max(0, maxRequests - current),
        resetIn: await redis.ttl(key)
    };
};

// ==================== INVALIDATION PATTERNS ====================

/**
 * Invalidate all caches for a user
 */
export const invalidateUserCache = async (userId) => {
    if (redis) {
        const keys = await redis.keys(`user:${userId}:*`);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    }
};

/**
 * Invalidate route cache
 */
export const invalidateRouteCache = async (from, to) => {
    await del(`route:${from}:${to}`);
    await del(`route:${to}:${from}`);
};

/**
 * Clear all cache (admin only)
 */
export const clearAllCache = async () => {
    if (redis) {
        await redis.flushdb();
        console.log('🗑️ All cache cleared');
    } else {
        memoryCache.clear();
    }
};

// ==================== CACHE STATS ====================

/**
 * Get cache statistics
 */
export const getStats = async () => {
    if (redis) {
        const info = await redis.info('stats');
        const dbSize = await redis.dbsize();
        return {
            provider: 'Redis',
            keys: dbSize,
            info: info
        };
    }

    return {
        provider: 'Memory',
        keys: memoryCache.size
    };
};

export default {
    get,
    set,
    del,
    cacheWrapper,
    cacheDriverLocation,
    getDriverLocation,
    getNearbyDrivers,
    removeDriverFromIndex,
    cacheSession,
    getSession,
    invalidateSession,
    cacheRoute,
    getCachedRoute,
    cacheMandiPrices,
    getCachedMandiPrices,
    checkRateLimit,
    invalidateUserCache,
    invalidateRouteCache,
    clearAllCache,
    getStats,
    CACHE_TTL
};
