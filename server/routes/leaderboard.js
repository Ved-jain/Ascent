import express from 'express';
import CFCache from '../models/CFCache.js';

const router = express.Router();

/**
 * GET /api/leaderboard
 * Returns a global leaderboard of all Ascent users.
 * Ranked primarily by Codeforces rating, and secondarily by problems solved.
 */
router.get('/', async (req, res) => {
  try {
    // Fetch all cached user profiles
    const profiles = await CFCache.find({});

    const leaderboard = profiles.map(profile => {
      // Calculate problems solved safely
      const problemsSolved = (profile.struggles?.struggled?.length || 0) + 
                             (profile.submissions?.filter(s => s.verdict === 'OK')?.length || 0);
      
      return {
        handle: profile.handle,
        rating: profile.userInfo?.rating || 0,
        maxRating: profile.userInfo?.maxRating || 0,
        rank: profile.userInfo?.rank || 'newbie',
        avatar: profile.userInfo?.titlePhoto || profile.userInfo?.avatar || '',
        problemsSolved
      };
    });

    // Sort by rating (descending), then by problems solved (descending)
    leaderboard.sort((a, b) => {
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      return b.problemsSolved - a.problemsSolved;
    });

    // Return the top 100 users
    res.json(leaderboard.slice(0, 100));

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch global leaderboard' });
  }
});

export default router;
