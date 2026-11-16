import fetch from 'node-fetch';
import { cacheGet, cacheSet, cacheLock } from './redis.js';

// Codeforces API base URL
const CF_BASE = 'https://codeforces.com/api';

const pendingRequests = new Map();

/**
 * Generic GET helper to fetch from Codeforces API and parse JSON response.
 * Implements the Cache-Aside pattern with Redis, in-memory request coalescing,
 * and automatic retries for API rate limits.
 * 
 * @param {string} endpoint - The API endpoint to hit (e.g. "user.info?handles=tourist")
 * @param {number} [retries=3] - Maximum retry attempts against Codeforces API
 * @returns {Promise<any>} - The result payload from Codeforces
 */
async function cfGet(endpoint, retries = 3) {
  const cacheKey = `cf:${endpoint}`;

  // 1. Check Redis Cache first (Cache-Aside pattern: cache lookup)
  const cacheStartTime = performance.now();
  let cachedData = null;
  try {
    cachedData = await cacheGet(cacheKey);
  } catch (err) {
    console.warn(`[Redis Failure] Cache access failed for "${cacheKey}": ${err.message}. Proceeding to source fetch.`);
    cachedData = null;
  }

  if (cachedData !== null && cachedData !== undefined) {
    const cacheLatency = (performance.now() - cacheStartTime).toFixed(2);
    console.log(`[API Response Duration] Endpoint: "${endpoint}" | Cache: HIT | Duration: ${cacheLatency}ms`);
    return cachedData;
  }

  const lookupLatency = (performance.now() - cacheStartTime).toFixed(2);
  console.log(`[Cache Miss] Key: "${cacheKey}" | Lookup: ${lookupLatency}ms. Fetching from Codeforces API...`);

  // 2. Request coalescing: If this exact endpoint is already currently in-flight,
  // share the active promise instead of firing duplicate outgoing requests.
  if (pendingRequests.has(endpoint)) {
    return pendingRequests.get(endpoint);
  }

  const promise = (async () => {
    // 3. Fetch directly from Codeforces API with retries
    for (let attempt = 1; attempt <= retries; attempt++) {
      const fetchStartTime = performance.now();
      try {
        const res = await fetch(`${CF_BASE}/${endpoint}`);
        const fetchLatency = (performance.now() - fetchStartTime).toFixed(2);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const json = await res.json();

        if (json.status !== 'OK') {
          if (json.comment && json.comment.includes('Call limit exceeded') && attempt < retries) {
            console.warn(`[External API Warning] Rate limit hit for ${endpoint}. Retrying in ${attempt * 1000}ms...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            continue;
          }
          // Non-retryable API error (e.g. "handles: User not found")
          const apiError = new Error(json.comment || 'CF API error');
          apiError.isNonRetryable = true;
          throw apiError;
        }

        // 4. Cache the successful API response in Redis (Cache-Aside: populate cache on miss)
        // Default TTL: 300 seconds (5 minutes)
        await cacheSet(cacheKey, json.result, 300);
        console.log(`[API Response Duration] Endpoint: "${endpoint}" | Cache: MISS | Duration: ${fetchLatency}ms (Saved to Redis TTL 300s)`);

        return json.result;
      } catch (error) {
        const failedDuration = (performance.now() - fetchStartTime).toFixed(2);
        console.error(`[External API Failure] Request to "${endpoint}" failed on attempt ${attempt}/${retries} (${failedDuration}ms): ${error.message}`);
        if (attempt === retries || error.isNonRetryable) throw error;
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  })();

  pendingRequests.set(endpoint, promise);
  try {
    return await promise;
  } finally {
    pendingRequests.delete(endpoint);
  }
}

/**
 * Fetch public profile information for a Codeforces handle.
 * @param {string} handle - Codeforces handle
 * @returns {Promise<object>} - User info object containing avatar, rank, maxRating, etc.
 */
export async function fetchUserInfo(handle) {
  const result = await cfGet(`user.info?handles=${encodeURIComponent(handle)}`);
  return result[0];
}

/**
 * Fetch rating history (contests participated in) for a Codeforces handle.
 * @param {string} handle - Codeforces handle
 * @returns {Promise<Array>} - List of contest rating details
 */
export async function fetchUserRating(handle) {
  return cfGet(`user.rating?handle=${encodeURIComponent(handle)}`);
}

/**
 * Fetch recent submissions (up to 10,000) for a Codeforces handle.
 * @param {string} handle - Codeforces handle
 * @returns {Promise<Array>} - List of submission history objects
 */
export async function fetchUserSubmissions(handle) {
  return cfGet(`user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`);
}
