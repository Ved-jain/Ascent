import { Redis } from '@upstash/redis';

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
    if (data !== null) {
      console.log(`[Redis] Cache HIT for key "${key}"`);
    } else {
      console.log(`[Redis] Cache MISS for key "${key}"`);
    }
    // Upstash automatically parses JSON, so we just return it directly
    return data || null;
  } catch (err) {
    console.warn(`[Redis] GET Error for key "${key}" (Fallback Triggered):`, err.message);
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
    // Upstash handles serialization automatically and uses { ex: ttl } syntax
    await redisClient.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.warn(`[Redis] SET Error for key "${key}":`, err.message);
  }
}

/**
 * Attempts to acquire a distributed lock.
 * @param {string} key - The lock key
 * @param {number} ttlSeconds - Lock expiration to prevent deadlocks
 * @returns {Promise<boolean>} - True if lock was acquired, false otherwise
 */
export async function cacheLock(key, ttlSeconds) {
  if (!redisClient) return true; // Proceed if Redis is disabled
  try {
    const result = await redisClient.set(key, 'locked', { nx: true, ex: ttlSeconds });
    return result === 'OK';
  } catch (err) {
    console.warn(`[Redis] LOCK Error for key "${key}":`, err.message);
    return true; // Fallback to allowing execution if lock fails
  }
}

export default redisClient;
