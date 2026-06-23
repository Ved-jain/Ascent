import express from 'express';
import { apiCache } from '../utils/cache.js';

const router = express.Router();

/**
 * GET /api/metrics/cache
 * Exposes internal memory cache statistics for the insights dashboard.
 */
router.get('/cache', (req, res) => {
  try {
    const stats = apiCache.getMetrics();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching cache metrics:', error);
    res.status(500).json({ error: 'Failed to fetch cache metrics' });
  }
});

export default router;
