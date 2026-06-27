import express from 'express';
import {
  getJourneyStartDate,
  getJourneyDay,
  getSnapshotAtDay,
  compareJourneys,
  getJourneyTimeline,
  predictMilestone,
  compareStruggles
} from '../utils/journey.js';
import { cacheGet, cacheSet } from '../utils/redis.js';
import { validateHandleParam, validateDayParam } from '../middleware/validate.js';

const router = express.Router();
router.param('handle', validateHandleParam);
router.param('myHandle', validateHandleParam);
router.param('peerHandle', validateHandleParam);
router.param('day', validateDayParam);

const TTL = 6 * 60 * 60; // 6 hours

/**
 * GET /api/journey/:handle/start
 * Returns journey start date and current journey day.
 */
router.get('/:handle/start', async (req, res) => {
  try {
    const handle = req.params.handle;
    const cacheKey = `journey_start_${handle.toLowerCase()}`;
    
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const startDate = await getJourneyStartDate(handle);
    const currentDay = await getJourneyDay(handle);
    
    const responseData = {
      handle,
      startDate,
      currentDay
    };
    
    await cacheSet(cacheKey, responseData, TTL);
    res.json({ ...responseData, cached: false });
  } catch (error) {
    console.error(`Error in /journey/${req.params.handle}/start:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/journey/:handle/snapshot/:day
 * Returns snapshot at specific journey day.
 */
router.get('/:handle/snapshot/:day', async (req, res) => {
  try {
    const handle = req.params.handle;
    const day = parseInt(req.params.day, 10);


    const snapshot = await getSnapshotAtDay(handle, day);
    res.json(snapshot);
  } catch (error) {
    console.error(`Error in /journey/${req.params.handle}/snapshot/${req.params.day}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/journey/:handle/timeline
 * Returns full journey timeline array.
 */
router.get('/:handle/timeline', async (req, res) => {
  try {
    const handle = req.params.handle;
    const cacheKey = `journey_timeline_${handle.toLowerCase()}`;
    
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json({ timeline: cached, cached: true });
    }

    const timeline = await getJourneyTimeline(handle);
    
    if (timeline.length < 30) {
      // Still return but we can flag it for frontend
      res.set('X-Warning-Insufficient-Data', 'true');
    }

    await cacheSet(cacheKey, timeline, TTL);
    res.json({ timeline, cached: false });
  } catch (error) {
    console.error(`Error in /journey/${req.params.handle}/timeline:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/journey/compare/:myHandle/:peerHandle
 * Returns full comparison object from compareJourneys function.
 */
router.get('/compare/:myHandle/:peerHandle', async (req, res) => {
  try {
    const { myHandle, peerHandle } = req.params;
    const cacheKey = `journey_compare_${myHandle.toLowerCase()}_${peerHandle.toLowerCase()}`;
    
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const comparison = await compareJourneys(myHandle, peerHandle);
    await cacheSet(cacheKey, comparison, TTL);
    
    res.json({ ...comparison, cached: false });
  } catch (error) {
    console.error(`Error in /journey/compare/${req.params.myHandle}/${req.params.peerHandle}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/journey/predict/:myHandle/:peerHandle/:targetRating
 * Predicts milestone reach date based on pace.
 */
router.get('/predict/:myHandle/:peerHandle/:targetRating', async (req, res) => {
  try {
    const { myHandle, peerHandle, targetRating } = req.params;
    const cacheKey = `journey_predict_${myHandle.toLowerCase()}_${peerHandle.toLowerCase()}_${targetRating}`;
    
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const prediction = await predictMilestone(myHandle, peerHandle, targetRating);
    await cacheSet(cacheKey, prediction, TTL);
    
    res.json({ ...prediction, cached: false });
  } catch (error) {
    console.error(`Error in /journey/predict/${req.params.myHandle}/${req.params.peerHandle}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/journey/struggles/:myHandle/:peerHandle
 * Returns complete struggle comparison.
 */
router.get('/struggles/:myHandle/:peerHandle', async (req, res) => {
  try {
    const { myHandle, peerHandle } = req.params;
    const cacheKey = `journey_struggles_${myHandle.toLowerCase()}_${peerHandle.toLowerCase()}`;
    
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const struggles = await compareStruggles(myHandle, peerHandle);
    await cacheSet(cacheKey, struggles, TTL);
    
    res.json({ ...struggles, cached: false });
  } catch (error) {
    console.error(`Error in /journey/struggles/${req.params.myHandle}/${req.params.peerHandle}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
