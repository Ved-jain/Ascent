import fetch from 'node-fetch';

// Codeforces API base URL
const CF_BASE = 'https://codeforces.com/api';

/**
 * Generic GET helper to fetch from Codeforces API and parse JSON response.
 * Throws an error if the CF response status is not "OK".
 * @param {string} endpoint - The API endpoint to hit (e.g. 'user.info?handles=handle')
 * @returns {Promise<any>} - The result payload from Codeforces
 */
async function cfGet(endpoint) {
  const res = await fetch(`${CF_BASE}/${endpoint}`);
  const json = await res.json();
  if (json.status !== 'OK') {
    throw new Error(json.comment || 'CF API error');
  }
  return json.result;
}

/**
 * Fetch public profile information for a Codeforces handle.
 * @param {string} handle - Codeforces handle
 * @returns {Promise<object>} - User info object containing avatar, rank, maxRating, etc.
 */
export async function fetchUserInfo(handle) {
  const result = await cfGet(`user.info?handles=${handle}`);
  return result[0];
}

/**
 * Fetch rating history (contests participated in) for a Codeforces handle.
 * @param {string} handle - Codeforces handle
 * @returns {Promise<Array>} - List of contest rating details
 */
export async function fetchUserRating(handle) {
  return cfGet(`user.rating?handle=${handle}`);
}

/**
 * Fetch recent submissions (up to 10,000) for a Codeforces handle.
 * @param {string} handle - Codeforces handle
 * @returns {Promise<Array>} - List of submission history objects
 */
export async function fetchUserSubmissions(handle) {
  return cfGet(`user.status?handle=${handle}&from=1&count=10000`);
}
