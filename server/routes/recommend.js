import express from 'express';
import fetch from 'node-fetch';
import User from '../models/User.js';
import CFCache from '../models/CFCache.js';
import authenticate from '../middleware/auth.js';
import { cacheGet, cacheSet } from '../utils/redis.js';

const router = express.Router();

// Simple in-memory cache for the entire Codeforces problemset (valid for 12 hours)
let cfProblemsetCache = null;
let cfProblemsetCacheTime = null;
const CACHE_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Helper to fetch the Codeforces problem set with local caching.
 * @returns {Promise<object>} - { problems: Array, problemStatistics: Array }
 */
async function getCodeforcesProblemset() {
  if (cfProblemsetCache && cfProblemsetCacheTime && (Date.now() - cfProblemsetCacheTime < CACHE_TIMEOUT_MS)) {
    return cfProblemsetCache;
  }

  const res = await fetch('https://codeforces.com/api/problemset.problems');
  const json = await res.json();
  if (json.status !== 'OK') {
    throw new Error('Failed to retrieve Codeforces problem list.');
  }

  cfProblemsetCache = json.result;
  cfProblemsetCacheTime = Date.now();
  return cfProblemsetCache;
}

/**
 * GET /api/cf/:handle/recommendations
 * Recommends 3 problems matching the user's weak tags and rating level.
 */
router.get('/:handle/recommendations', authenticate, async (req, res) => {
  const requestHandle = req.params.handle.trim().toLowerCase();
  const cacheKey = `recommendations:${requestHandle}`;

  try {
    // 1. Measure response time and try to get recommendations from Redis Cache first
    const startTime = performance.now();
    const cachedRecs = await cacheGet(cacheKey);

    if (cachedRecs) {
      // Cache HIT
      const latency = (performance.now() - startTime).toFixed(2);
      console.log(`[Redis] Cache HIT for recommendations (${requestHandle}) - Response Time: ${latency}ms`);
      return res.json(cachedRecs);
    }

    // Cache MISS
    const cacheLookupLatency = (performance.now() - startTime).toFixed(2);
    console.log(`[Redis] Cache MISS for recommendations (${requestHandle}) - Lookup took ${cacheLookupLatency}ms. Generating fresh recommendations...`);

    const genStartTime = performance.now();

    // 1. Fetch user cache details
    const cfCache = await CFCache.findOne({ handle: requestHandle });
    if (!cfCache) {
      return res.status(404).json({ error: 'Codeforces cache not found. Please sync your dashboard first.' });
    }

    const currentRating = cfCache.userInfo?.rating || 1000;
    
    // Extract user's weak tags (from computeStruggles calculation)
    // Struggles model contains weakTags: [{ tag: 'dp', errorRate: 60, ... }]
    const weakTags = (cfCache.struggles?.weakTags || []).map(t => t.tag);

    // Fallback default tags if user has no weak tags detected yet
    const targetTags = weakTags.length > 0 
      ? weakTags 
      : ['dp', 'greedy', 'math', 'graphs', 'data structures', 'implementation'];

    // Collect user's already solved problems to exclude them
    const solvedSet = new Set(
      (cfCache.submissions || [])
        .filter(s => s.verdict === 'OK' && s.problem)
        .map(s => `${s.problem.contestId}${s.problem.index}`.toUpperCase())
    );

    // 2. Load the global problemset
    let problemsetResult;
    try {
      problemsetResult = await getCodeforcesProblemset();
    } catch (apiErr) {
      console.error('Error fetching global problemset:', apiErr.message);
      return res.status(503).json({ error: 'Codeforces problemset API is temporarily unavailable.' });
    }

    const { problems, problemStatistics } = problemsetResult;

    // Create a quick lookup map for solve statistics (solve count indicates quality)
    const statsMap = {};
    problemStatistics.forEach(stat => {
      const key = `${stat.contestId}${stat.index}`.toUpperCase();
      statsMap[key] = stat.solvedCount || 0;
    });

    // 3. Filter problems
    const ratingMin = Math.max(800, currentRating - 100);
    const ratingMax = currentRating + 100;

    const candidates = [];
    for (const prob of problems) {
      if (!prob.rating || prob.rating < ratingMin || prob.rating > ratingMax) {
        continue;
      }

      const key = `${prob.contestId}${prob.index}`.toUpperCase();
      
      // Exclude solved
      if (solvedSet.has(key)) {
        continue;
      }

      // Check if problem contains at least one target tag
      const hasMatchingTag = (prob.tags || []).some(t => targetTags.includes(t));
      if (!hasMatchingTag) {
        continue;
      }

      candidates.push({
        problemId: `${prob.contestId}${prob.index}`,
        name: prob.name,
        rating: prob.rating,
        tags: prob.tags || [],
        solveCount: statsMap[key] || 0
      });
    }

    // 4. Select top recommendations
    // Sort by solveCount descending (most solved = most standard/popular)
    candidates.sort((a, b) => b.solveCount - a.solveCount);

    // Pick 3 problems. We grab randomly from the top 30 to offer variety on refreshes.
    const sliceCount = Math.min(30, candidates.length);
    const selectionSlice = candidates.slice(0, sliceCount);
    
    const selected = [];
    const usedIndices = new Set();

    while (selected.length < Math.min(3, selectionSlice.length) && usedIndices.size < selectionSlice.length) {
      const randIdx = Math.floor(Math.random() * selectionSlice.length);
      if (!usedIndices.has(randIdx)) {
        usedIndices.add(randIdx);
        selected.push(selectionSlice[randIdx]);
      }
    }

    const genLatency = (performance.now() - genStartTime).toFixed(2);

    // 5. Cache the generated recommendations
    // TTL is 1 hour (3600 seconds) as requested to avoid constantly recalculating
    await cacheSet(cacheKey, selected, 3600);

    console.log(`[Source] Generated recommendations for ${requestHandle} - Time taken: ${genLatency}ms.`);

    return res.json(selected);

  } catch (error) {
    console.error('Recommendations API error:', error);
    return res.status(500).json({ error: 'Internal server error generating problem recommendations.' });
  }
});

export default router;
