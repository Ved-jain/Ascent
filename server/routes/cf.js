import express from 'express';
import CFCache from '../models/CFCache.js';
import { fetchUserInfo, fetchUserRating, fetchUserSubmissions } from '../utils/fetchCF.js';
import { computeStruggles } from '../utils/computeStruggles.js';
import { apiCache } from '../utils/cache.js';

const router = express.Router();

// Helper to determine if a cache document is stale (older than 30 minutes)
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * GET /api/cf/:handle
 * Retrieve user info, rating history, submissions.
 * Checks CFCache first. If missing or older than 30 mins, fetches from Codeforces API and updates cache.
 */
router.get('/:handle', async (req, res) => {
  const handle = req.params.handle.trim().toLowerCase();
  
  if (!handle) {
    return res.status(400).json({ message: 'Handle parameter is required' });
  }

  try {
    // 0. Check Advanced In-Memory Cache (Blazing Fast)
    const memCacheKey = `cf_profile_${handle}`;
    const memCached = apiCache.get(memCacheKey);
    if (memCached) {
      console.log(`[Cache] Memory hit for ${handle}`);
      return res.json(memCached);
    }

    // 1. Check database cache
    let cached = await CFCache.findOne({ handle });

    if (cached) {
      const age = Date.now() - new Date(cached.cachedAt).getTime();
      if (age < CACHE_TTL_MS) {
        const payload = {
          handle: cached.handle,
          rating: cached.userInfo?.rating || 0,
          maxRating: cached.userInfo?.maxRating || 0,
          rank: cached.userInfo?.rank || 'newbie',
          avatar: cached.userInfo?.titlePhoto || cached.userInfo?.avatar || '',
          country: cached.userInfo?.country || '',
          problemsSolved: cached.struggles?.struggled?.length + (cached.submissions?.filter(s => s.verdict === 'OK')?.length || 0), // estimation/exact logic
          ratingHistory: cached.ratingHistory || [],
          submissions: cached.submissions || [],
          cachedAt: cached.cachedAt
        };

        // Populate Memory Cache before returning
        apiCache.set(memCacheKey, payload);
        return res.json(payload);
      }
    }

    // 2. Fetch fresh data from Codeforces
    // Wrap fetches in try-catch to identify CF specific API issues
    let userInfo, ratingHistory, submissions;
    try {
      userInfo = await fetchUserInfo(handle);
      ratingHistory = await fetchUserRating(handle);
      submissions = await fetchUserSubmissions(handle);
    } catch (cfErr) {
      console.error(`Error calling CF API for handle ${handle}:`, cfErr.message);
      return res.status(404).json({ message: `Could not fetch Codeforces data for handle "${handle}". Check if the handle is valid.` });
    }

    // 3. Compute struggle patterns
    const struggles = computeStruggles(submissions);

    // Calculate unique ACs as problemsSolved
    const uniqueAcProblems = new Set(
      submissions
        .filter(s => s.verdict === 'OK' && s.problem)
        .map(s => `${s.problem.contestId}${s.problem.index}`)
    );

    // 4. Update database cache (upsert)
    if (cached) {
      cached.userInfo = userInfo;
      cached.submissions = submissions;
      cached.ratingHistory = ratingHistory;
      cached.struggles = struggles;
      cached.cachedAt = new Date();
      await cached.save();
    } else {
      cached = await CFCache.create({
        handle,
        userInfo,
        submissions,
        ratingHistory,
        struggles,
        cachedAt: new Date()
      });
    }

    // 5. Respond
    const payload = {
      handle: cached.handle,
      rating: userInfo.rating || 0,
      maxRating: userInfo.maxRating || 0,
      rank: userInfo.rank || 'newbie',
      avatar: userInfo.titlePhoto || userInfo.avatar || '',
      country: userInfo.country || '',
      problemsSolved: uniqueAcProblems.size,
      ratingHistory: ratingHistory,
      submissions: submissions,
      cachedAt: cached.cachedAt
    };

    apiCache.set(memCacheKey, payload);
    return res.json(payload);

  } catch (error) {
    console.error('Unhandled server error in GET /api/cf/:handle:', error);
    return res.status(500).json({ message: 'Internal server error processing Codeforces data' });
  }
});

/**
 * GET /api/cf/:handle/struggles
 * Retrieve the precomputed struggle profile (struggled, abandoned, weak tags) for a handle.
 */
router.get('/:handle/struggles', async (req, res) => {
  const handle = req.params.handle.trim().toLowerCase();

  if (!handle) {
    return res.status(400).json({ message: 'Handle parameter is required' });
  }

  try {
    // 0. Check Advanced In-Memory Cache
    const memCacheKey = `cf_struggles_${handle}`;
    const memCached = apiCache.get(memCacheKey);
    if (memCached) {
      console.log(`[Cache] Memory hit for struggles ${handle}`);
      return res.json(memCached);
    }

    let cached = await CFCache.findOne({ handle });
    
    // Check if cache exists and is fresh. If not, we update the cache first.
    const isStale = !cached || (Date.now() - new Date(cached.cachedAt).getTime() >= CACHE_TTL_MS);

    if (isStale) {
      try {
        const userInfo = await fetchUserInfo(handle);
        const ratingHistory = await fetchUserRating(handle);
        const submissions = await fetchUserSubmissions(handle);
        const struggles = computeStruggles(submissions);
        
        if (cached) {
          cached.userInfo = userInfo;
          cached.submissions = submissions;
          cached.ratingHistory = ratingHistory;
          cached.struggles = struggles;
          cached.cachedAt = new Date();
          await cached.save();
        } else {
          cached = await CFCache.create({
            handle,
            userInfo,
            submissions,
            ratingHistory,
            struggles,
            cachedAt: new Date()
          });
        }
      } catch (cfErr) {
        console.error(`Error calling CF API during struggles fetch for ${handle}:`, cfErr.message);
        // If CF is down or handle invalid but we have stale cache, we can fallback to it
        if (!cached) {
          return res.status(404).json({ message: `Could not fetch Codeforces data for handle "${handle}".` });
        }
      }
    }

    const payload = {
      handle: cached.handle,
      struggled: cached.struggles?.struggled || [],
      abandoned: cached.struggles?.abandoned || [],
      weakTags: cached.struggles?.weakTags || []
    };

    apiCache.set(memCacheKey, payload);
    return res.json(payload);

  } catch (error) {
    console.error('Unhandled server error in GET /api/cf/:handle/struggles:', error);
    return res.status(500).json({ message: 'Internal server error processing struggle profile' });
  }
});

export default router;
