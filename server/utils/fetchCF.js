import fetch from 'node-fetch';
import { cacheGet, cacheSet } from './redis.js';

// Codeforces API base URL
const CF_BASE = 'https://codeforces.com/api';

const pendingRequests = new Map();

/**
 * Generic GET helper to fetch from Codeforces API and parse JSON response.
 * Implements request coalescing, Redis caching, and automatic retries for rate limits.
 * @param {string} endpoint - The API endpoint to hit
 * @returns {Promise<any>} - The result payload from Codeforces
 */
async function cfGet(endpoint, retries = 3) {
  if (pendingRequests.has(endpoint)) {
    return pendingRequests.get(endpoint);
  }

  const promise = (async () => {
    const cacheKey = `cf:${endpoint}`;
    
    // 1. Measure response time and try to get from Redis Cache first
    const startTime = performance.now();
    const cachedData = await cacheGet(cacheKey);

    if (cachedData) {
      const latency = (performance.now() - startTime).toFixed(2);
      console.log(`[Redis] Cache HIT for ${endpoint} - Response Time: ${latency}ms`);
      return cachedData;
    }

    const cacheLookupLatency = (performance.now() - startTime).toFixed(2);
    console.log(`[Redis] Cache MISS for ${endpoint} - Lookup took ${cacheLookupLatency}ms. Fetching from source...`);

    // 2. Fetch directly from Codeforces API with retries
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const fetchStartTime = performance.now();
        const res = await fetch(`${CF_BASE}/${endpoint}`);
        const json = await res.json();
        const fetchLatency = (performance.now() - fetchStartTime).toFixed(2);

        if (json.status !== 'OK') {
          if (json.comment && json.comment.includes('Call limit exceeded') && attempt < retries) {
            console.warn(`[CF API] Rate limit hit for ${endpoint}. Retrying in ${attempt * 1000}ms...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            continue;
          }
          throw new Error(json.comment || 'CF API error');
        }

        // 3. Cache the successful API response (TTL 5 mins)
        await cacheSet(cacheKey, json.result, 300);
        console.log(`[Source] Fetched ${endpoint} from Codeforces API - Response Time: ${fetchLatency}ms.`);
        return json.result;
      } catch (error) {
        if (attempt === retries) throw error;
        console.warn(`[CF API] Request failed for ${endpoint}. Retrying in ${attempt * 1000}ms...`, error.message);
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
