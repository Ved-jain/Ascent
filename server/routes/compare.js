import express from 'express';
import CFCache from '../models/CFCache.js';
import { fetchUserInfo, fetchUserRating, fetchUserSubmissions } from '../utils/fetchCF.js';
import { computeStruggles } from '../utils/computeStruggles.js';
import { alignTimeline, getStartDate } from '../utils/alignTimelines.js';

const router = express.Router();

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Helper to get user CF data from cache or fetch and cache it if stale/missing.
 * @param {string} handle - Codeforces handle
 * @returns {Promise<object>} - Cached or fresh CFCache document
 */
async function getOrFetchUserData(handle) {
  const cleanHandle = handle.trim().toLowerCase();
  let cached = await CFCache.findOne({ handle: cleanHandle });

  if (cached) {
    const age = Date.now() - new Date(cached.cachedAt).getTime();
    if (age < CACHE_TTL_MS) {
      return cached;
    }
  }

  // Fetch from Codeforces API
  const userInfo = await fetchUserInfo(cleanHandle);
  const ratingHistory = await fetchUserRating(cleanHandle);
  const submissions = await fetchUserSubmissions(cleanHandle);
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
      handle: cleanHandle,
      userInfo,
      submissions,
      ratingHistory,
      struggles,
      cachedAt: new Date()
    });
  }

  return cached;
}

/**
 * GET /api/compare/:myHandle/:friendHandle
 * Public endpoint to align and compare rating progression over relative timeline days.
 */
router.get('/:myHandle/:friendHandle', async (req, res) => {
  const { myHandle, friendHandle } = req.params;

  if (!myHandle || !friendHandle) {
    return res.status(400).json({ error: 'Both handles are required for comparison.' });
  }

  try {
    // Fetch and cache data for both users in parallel
    let myData, friendData;
    try {
      [myData, friendData] = await Promise.all([
        getOrFetchUserData(myHandle),
        getOrFetchUserData(friendHandle)
      ]);
    } catch (cfErr) {
      console.error('Error fetching CF data for comparison:', cfErr.message);
      return res.status(404).json({
        error: `Could not fetch Codeforces data. Verify that both handles "${myHandle}" and "${friendHandle}" are valid.`
      });
    }

    // Determine start dates (Unix timestamps of first submission)
    const myStart = getStartDate(myData.submissions);
    const friendStart = getStartDate(friendData.submissions);

    // Fallback: If no submission start exists, use first rating contest or user creation
    const finalMyStart = myStart || (myData.ratingHistory[0]?.ratingUpdateTimeSeconds) || (Date.now() / 1000);
    const finalFriendStart = friendStart || (friendData.ratingHistory[0]?.ratingUpdateTimeSeconds) || (Date.now() / 1000);

    // Align timelines
    const myAligned = alignTimeline(myData.ratingHistory, finalMyStart);
    const friendAligned = alignTimeline(friendData.ratingHistory, finalFriendStart);

    return res.json({
      you: {
        handle: myData.handle,
        aligned: myAligned
      },
      friend: {
        handle: friendData.handle,
        aligned: friendAligned
      }
    });

  } catch (error) {
    console.error('Comparison route error:', error);
    return res.status(500).json({ error: 'Internal server error calculating timeline comparison.' });
  }
});

export default router;
