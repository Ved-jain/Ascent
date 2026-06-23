// ─────────────────────────────────────────────────────────
//  routes/profile.js  —  Profile Routes
//
//  Routes in this file:
//    GET /api/profile      → get the logged-in user's data
//    PUT /api/profile      → update CF handle or start date
//
//  Both routes are PROTECTED — they require a valid JWT.
//  That's what `authenticate` does: it runs before the handler
//  and either sets req.user (success) or returns a 401 (fail).
//
//  Notice the pattern:
//    router.get('/path', authenticate, (req, res) => { ... })
//                        ^^^^^^^^^^^
//                        middleware runs first, then our handler
// ─────────────────────────────────────────────────────────

import express from 'express';
import User from '../models/User.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

// ── GET /api/profile ──────────────────────────────────────
//
//  Returns the current user's profile data.
//  req.user is set by the authenticate middleware —
//  it contains { id, username } decoded from the JWT token.
//
router.get('/', authenticate, async (req, res) => {
  try {
    // Find the user by the id from the JWT payload
    // .select('-passwordHash') means: return all fields EXCEPT passwordHash
    // We never send the password hash to the frontend — ever.
    const user = await User.findById(req.user.id).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      id: user._id,
      username: user.username,
      codeforcesHandle: user.codeforcesHandle,
      startDate: user.startDate,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({ error: 'Could not fetch profile.' });
  }
});

// ── PUT /api/profile ──────────────────────────────────────
//
//  Updates the current user's profile.
//  The user can change their CF handle or start date.
//  We only update the fields that were actually sent in the request.
//
//  Request body (all optional):
//    { codeforcesHandle, startDate }
//
router.put('/', authenticate, async (req, res) => {
  try {
    const { codeforcesHandle, startDate } = req.body;

    // Build an update object with only the fields that were sent
    // This way we don't accidentally clear fields that weren't included
    const updates = {};
    if (codeforcesHandle !== undefined) updates.codeforcesHandle = codeforcesHandle.trim();
    if (startDate !== undefined) updates.startDate = new Date(startDate);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update were provided.' });
    }

    // findByIdAndUpdate with { new: true } returns the UPDATED document
    // instead of the document before the update.
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { returnDocument: 'after' }
    ).select('-passwordHash');

    res.json({
      id: user._id,
      username: user.username,
      codeforcesHandle: user.codeforcesHandle,
      startDate: user.startDate,
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ error: 'Could not update profile.' });
  }
});

export default router;
