import fetch from 'node-fetch';
import { cacheGet, cacheSet } from './redis.js';

// Codeforces API base URL
const CF_BASE = 'https://codeforces.com/api';

/**
 * Generic GET helper to fetch from Codeforces API and parse JSON response.
 * Implements Redis caching with a 5-minute TTL, fallback mechanism, and latency logging.
 * Throws an error if the CF response status is not "OK".
 * @param {string} endpoint - The API endpoint to hit (e.g. 'user.info?handles=handle')
 * @returns {Promise<any>} - The result payload from Codeforces
 */
async function cfGet(endpoint) {
  const cacheKey = `cf:${endpoint}`;
  
  // 1. Measure response time and try to get from Redis Cache first
  const startTime = performance.now();
  const cachedData = await cacheGet(cacheKey);

  if (cachedData) {
    // Cache HIT
    const latency = (performance.now() - startTime).toFixed(2);
    console.log(`[Redis] Cache HIT for ${endpoint} - Response Time: ${latency}ms`);
    return cachedData;
  }

  // Cache MISS
  const cacheLookupLatency = (performance.now() - startTime).toFixed(2);
  console.log(`[Redis] Cache MISS for ${endpoint} - Lookup took ${cacheLookupLatency}ms. Fetching from source...`);

  // 2. Fetch directly from Codeforces API
  const fetchStartTime = performance.now();
  const res = await fetch(`${CF_BASE}/${endpoint}`);
  const json = await res.json();
  const fetchLatency = (performance.now() - fetchStartTime).toFixed(2);

  if (json.status !== 'OK') {
    throw new Error(json.comment || 'CF API error');
  }

  // 3. Cache the successful API response
  // TTL is 5 minutes (300 seconds) as requested for user stats to keep data relatively fresh
  await cacheSet(cacheKey, json.result, 300);

  console.log(`[Source] Fetched ${endpoint} from Codeforces API - Response Time: ${fetchLatency}ms.`);

  return json.result;
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
