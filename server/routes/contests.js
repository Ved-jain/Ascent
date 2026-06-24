import express from 'express';
import fetch from 'node-fetch';
import { apiCache } from '../utils/cache.js';

const router = express.Router();

/**
 * GET /api/contests/upcoming
 * Fetches the next 3 upcoming Codeforces contests.
 * Caches the response for 1 hour to prevent rate limits.
 */
router.get('/upcoming', async (req, res) => {
  const cacheKey = 'cf_upcoming_contests';
  
  try {
    const memCached = apiCache.get(cacheKey);
    if (memCached) {
      return res.json(memCached);
    }

    const response = await fetch('https://codeforces.com/api/contest.list');
    const json = await response.json();
    
    if (json.status !== 'OK') {
      throw new Error('Failed to fetch contests from Codeforces');
    }

    // Filter to only upcoming contests, sort by soonest first
    const upcoming = json.result
      .filter(contest => contest.phase === 'BEFORE')
      .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)
      .slice(0, 3); // Get the next 3

    // Cache for 1 hour (3600 seconds)
    apiCache.set(cacheKey, upcoming, 3600);
    
    res.json(upcoming);
  } catch (err) {
    console.error('Upcoming contests error:', err);
    res.status(500).json({ error: 'Failed to retrieve upcoming contests' });
  }
});

export default router;
