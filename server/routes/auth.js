// ─────────────────────────────────────────────────────────
//  routes/auth.js  —  Register and Login Routes
//
//  Routes in this file:
//    POST /api/auth/register   → create a new account
//    POST /api/auth/login      → log in and get a token
//
//  Why these two?
//    Every other API route (checkins, profile, etc.) needs
//    to know WHO is making the request. That "who" comes from
//    a JWT token. These routes are what create and give out tokens.
// ─────────────────────────────────────────────────────────

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// ── Helper: create a signed JWT token ─────────────────────
//    We call this in both register and login so there's no
//    duplicated code. DRY = Don't Repeat Yourself.
const createToken = (user) => {
  return jwt.sign(
    // Payload — what we embed inside the token
    { id: user._id, username: user.username },
    // Secret key from .env
    process.env.JWT_SECRET,
    // Token expires in 7 days — user won't need to log in again for a week
    { expiresIn: '7d' }
  );
};

// ── POST /api/auth/register ───────────────────────────────
//
//  Request body: { username, password, codeforcesHandle }
//  Response:     { token, user: { id, username, codeforcesHandle, startDate } }
//
router.post('/register', async (req, res) => {
  try {
    const { username, password, codeforcesHandle } = req.body;

    // ── Validate input ──────────────────────────────────
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // ── Check if username already exists ────────────────
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    // ── Hash the password ────────────────────────────────
    //    bcrypt.hash(plainText, saltRounds)
    //    saltRounds=10 is the industry standard — high enough to be
    //    secure, low enough to not slow the server down.
    //    The hash is a one-way transformation — you CANNOT reverse it.
    const passwordHash = await bcrypt.hash(password, 10);

    // ── Create and save the user ─────────────────────────
    const user = await User.create({
      username,
      passwordHash,
      codeforcesHandle: codeforcesHandle || '',
    });

    // ── Sign a token and return it ───────────────────────
    const token = createToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        codeforcesHandle: user.codeforcesHandle,
        startDate: user.startDate,
      },
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────
//
//  Request body: { username, password }
//  Response:     { token, user: { id, username, codeforcesHandle, startDate } }
//
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // ── Validate input ──────────────────────────────────
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // ── Find the user ────────────────────────────────────
    const user = await User.findOne({ username });
    if (!user) {
      // We return the same message whether username is wrong OR password
      // is wrong — this prevents attackers from knowing which is incorrect.
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // ── Compare password with stored hash ────────────────
    //    bcrypt.compare returns true if the plain password matches the hash
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // ── Sign a token and return it ───────────────────────
    const token = createToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        codeforcesHandle: user.codeforcesHandle,
        startDate: user.startDate,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

export default router;
