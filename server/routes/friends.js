import express from 'express';
import User from '../models/User.js';
import authenticate from '../middleware/auth.js';
import { fetchUserInfo } from '../utils/fetchCF.js';

const router = express.Router();

/**
 * GET /api/friends
 * Returns list of friends' handles saved by the current user.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    // Return array of handles
    return res.json(user.friends || []);
  } catch (error) {
    console.error('Error fetching friends:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve friends.' });
  }
});

/**
 * POST /api/friends
 * Adds a friend by Codeforces handle. Verifies first that the handle exists on Codeforces.
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { handle } = req.body;
    
    if (!handle || typeof handle !== 'string' || !handle.trim()) {
      return res.status(400).json({ error: 'Codeforces handle is required.' });
    }

    const cleanHandle = handle.trim().toLowerCase();

    // Verify handle existence with CF API
    try {
      await fetchUserInfo(cleanHandle);
    } catch (cfErr) {
      return res.status(404).json({ error: `Handle "${handle}" was not found on Codeforces.` });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Initialize friends array if not present
    if (!user.friends) {
      user.friends = [];
    }

    // Check for duplicates
    const alreadyFriend = user.friends.some(f => f.toLowerCase() === cleanHandle);
    if (alreadyFriend) {
      return res.status(400).json({ error: `${handle} is already in your friends list.` });
    }

    // Add friend
    user.friends.push(cleanHandle);
    await user.save();

    return res.status(201).json({
      handle: cleanHandle,
      addedAt: new Date()
    });
  } catch (error) {
    console.error('Error adding friend:', error.message);
    return res.status(500).json({ error: 'Failed to add friend.' });
  }
});

/**
 * DELETE /api/friends/:handle
 * Removes a friend from the current user's friends list.
 */
router.delete('/:handle', authenticate, async (req, res) => {
  try {
    const handleToRemove = req.params.handle.trim().toLowerCase();
    
    if (!handleToRemove) {
      return res.status(400).json({ error: 'Handle to remove is required.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.friends) {
      user.friends = [];
    }

    // Filter out the handle
    const initialLength = user.friends.length;
    user.friends = user.friends.filter(f => f.toLowerCase() !== handleToRemove);

    if (user.friends.length === initialLength) {
      return res.status(404).json({ error: `Friend "${req.params.handle}" not found in your list.` });
    }

    await user.save();
    return res.json({ message: `Successfully removed "${req.params.handle}" from friends list.` });
  } catch (error) {
    console.error('Error removing friend:', error.message);
    return res.status(500).json({ error: 'Failed to remove friend.' });
  }
});

export default router;
