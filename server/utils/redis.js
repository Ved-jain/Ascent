import { Redis } from '@upstash/redis';

// Create a Redis client instance using Upstash REST API
const redisClient = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

if (!redisClient) {
  console.warn('[Redis] No UPSTASH_REDIS_REST_URL or TOKEN provided. Cache is disabled and will fallback to direct DB fetching.');
} else {
  console.log('[Redis] Configured to use Upstash REST API.');
}

/**
 * Safe GET method with fallback mechanism.
 * If Redis is down or an error occurs, it catches the error and returns null.
 * 
 * @param {string} key - The cache key
 * @returns {Promise<any|null>} - The parsed data, or null if missing/error
 */
export async function cacheGet(key) {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(key);
    // Upstash automatically parses JSON if it is stored as an object.
    // However, if it's stored manually as a string (from old code), we parse it safely.
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    }
    return data || null;
  } catch (err) {
    console.error(`[Redis] GET Error for key "${key}" (Fallback Triggered):`, err.message);
    return null; // Fallback to fetching from source
  }
}

/**
 * Safe SET method with fallback mechanism.
 * Caches data with a given Time-To-Live (TTL).
 * 
 * @param {string} key - The cache key
 * @param {any} value - The value to cache
 * @param {number} ttlSeconds - Time to live in seconds
 */
export async function cacheSet(key, value, ttlSeconds) {
  if (!redisClient) return;
  try {
    // Upstash handles serialization automatically
    await redisClient.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.error(`[Redis] SET Error for key "${key}":`, err.message);
  }
}

export default redisClient;
