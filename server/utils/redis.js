import Redis from 'ioredis';

// Create a Redis client instance.
// Using default configuration (localhost:6379) but could be extended via env vars.
const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  // We limit retries so that if Redis is completely down, 
  // it stops trying to reconnect constantly and fully relies on the fallback.
  retryStrategy: (times) => {
    if (times > 3) {
      console.warn('[Redis] Connection retry limit reached. Redis fallback is active.');
      return null; // Stop retrying
    }
    return Math.min(times * 100, 3000);
  },
  // Crucial for fallback: If a request fails, fail immediately instead of queuing up forever.
  maxRetriesPerRequest: 1, 
});

redisClient.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

redisClient.on('connect', () => {
  console.log('[Redis] Connected successfully.');
});

/**
 * Safe GET method with fallback mechanism.
 * If Redis is down or an error occurs, it catches the error and returns null.
 * This ensures the application gracefully falls back to fetching from the original source.
 * 
 * @param {string} key - The cache key
 * @returns {Promise<any|null>} - The parsed data, or null if missing/error
 */
export async function cacheGet(key) {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`[Redis] GET Error for key "${key}" (Fallback Triggered):`, err.message);
    // Fallback: return null to force fetch from source without crashing
    return null;
  }
}

/**
 * Safe SET method with fallback mechanism.
 * Caches data with a given Time-To-Live (TTL).
 * If an error occurs, it just logs it and continues without crashing.
 * 
 * @param {string} key - The cache key
 * @param {any} value - The value to cache
 * @param {number} ttlSeconds - Time to live in seconds
 */
export async function cacheSet(key, value, ttlSeconds) {
  try {
    const stringValue = JSON.stringify(value);
    await redisClient.set(key, stringValue, 'EX', ttlSeconds);
  } catch (err) {
    console.error(`[Redis] SET Error for key "${key}":`, err.message);
    // Fallback: do nothing, just skip caching and continue
  }
}

export default redisClient;
