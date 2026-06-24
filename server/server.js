// ─────────────────────────────────────────────────────────
//  server.js  —  Ascent API Entry Point
//
//  What this file does:
//    1. Loads environment variables from .env
//    2. Connects to MongoDB
//    3. Creates the Express app
//    4. Registers middleware (JSON parsing, CORS)
//    5. Mounts routes
//    6. Starts listening on the port
// ─────────────────────────────────────────────────────────

import 'dotenv/config';          // loads .env into process.env
import express from 'express';
import cors from 'cors';
import connectDB from './db.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import cfRoutes from './routes/cf.js';
import friendsRoutes from './routes/friends.js';
import notesRoutes from './routes/notes.js';
import compareRoutes from './routes/compare.js';
import recommendRoutes from './routes/recommend.js';
import metricsRoutes from './routes/metrics.js';
import leaderboardRoutes from './routes/leaderboard.js';
import contestsRoutes from './routes/contests.js';
import prepRoutes from './routes/prep.js';

// ── 1. Connect to Database first ─────────────────────────
//    We await the DB connection before starting the server.
//    If the DB is down, the server won't start — which is correct.
await connectDB();

// ── 2. Create Express app ─────────────────────────────────
const app = express();

// ── 3. Middleware ─────────────────────────────────────────
//    express.json()  → lets us read JSON bodies from requests  (req.body)
//    cors()          → allows the frontend (different port) to call this API
app.use(express.json());
app.use(cors());

// ── 4. Routes ────────────────────────────────────────────
//    Each router handles a group of related endpoints.
//    The prefix here + the path in the router = the full URL.
//    e.g. '/api/auth' + '/register' = POST /api/auth/register
import aiRoutes from './routes/ai.js';

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/cf', cfRoutes);
app.use('/api/cf', recommendRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/contests', contestsRoutes);
app.use('/api/prep', prepRoutes);

// ── 5. Health Check Route ─────────────────────────────────
//    A simple GET route so we can confirm the server is alive.
//    Visit http://localhost:5000/api/health in the browser to test.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Ascent server is running',
    timestamp: new Date().toISOString(),
  });
});

// ── 6. 404 Handler ───────────────────────────────────────
//    If no route matched, send a clear error instead of crashing.
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── 7. Global Error Handler ──────────────────────────────
//    Express calls this whenever a route throws an error.
//    The four parameters (err, req, res, next) are what tell
//    Express this is an error-handling middleware.
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── 8. Start Server ──────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`  ✅ Ascent server running on http://localhost:${PORT}`);
  console.log(`  ✅ Health check → http://localhost:${PORT}/api/health\n`);
});