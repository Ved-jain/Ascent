import express from 'express';
import fetch from 'node-fetch';
import CFCache from '../models/CFCache.js';
import authenticate from '../middleware/auth.js';
import { validateHandleParam } from '../middleware/validate.js';

const router = express.Router();
router.param('handle', validateHandleParam);

let cfProblemsetCache = null;
let cfProblemsetCacheTime = null;
const CACHE_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 hours

async function getCodeforcesProblemset() {
  if (cfProblemsetCache && cfProblemsetCacheTime && (Date.now() - cfProblemsetCacheTime < CACHE_TIMEOUT_MS)) {
    return cfProblemsetCache;
  }
  const res = await fetch('https://codeforces.com/api/problemset.problems');
  const json = await res.json();
  if (json.status !== 'OK') throw new Error('Failed to retrieve Codeforces problem list.');
  
  cfProblemsetCache = json.result;
  cfProblemsetCacheTime = Date.now();
  return cfProblemsetCache;
}

/**
 * GET /api/prep/:handle?goal=Specialist
 * Generates a tailored problem set of 4 questions for the specific rank goal.
 */
router.get('/:handle', authenticate, async (req, res) => {
  const handle = req.params.handle.trim().toLowerCase();
  const goal = (req.query.goal || 'Pupil').toLowerCase();

  try {
    const cfCache = await CFCache.findOne({ handle });
    if (!cfCache) {
      return res.status(404).json({ error: 'Codeforces cache not found. Please sync your dashboard.' });
    }

    // Define rating bracket targets based on goals
    let minRating = 800;
    let maxRating = 1100;

    switch (goal) {
      case 'pupil':
        minRating = 800; maxRating = 1100; // Div 2 A, B
        break;
      case 'specialist':
        minRating = 1200; maxRating = 1400; // Div 2 B, C
        break;
      case 'expert':
        minRating = 1500; maxRating = 1700; // Div 2 C, D
        break;
      case 'master':
        minRating = 1800; maxRating = 2100; // Div 2 D, E
        break;
      default:
        minRating = 1200; maxRating = 1400;
    }

    // Extract weak tags to focus on
    const weakTags = (cfCache.struggles?.weakTags || []).map(t => t.tag);
    const targetTags = weakTags.length > 0 
      ? weakTags 
      : ['dp', 'greedy', 'math', 'graphs', 'data structures', 'implementation'];

    // Extract solved to prevent duplicates
    const solvedSet = new Set(
      (cfCache.submissions || [])
        .filter(s => s.verdict === 'OK' && s.problem)
        .map(s => `${s.problem.contestId}${s.problem.index}`.toUpperCase())
    );

    const { problems, problemStatistics } = await getCodeforcesProblemset();

    const statsMap = {};
    problemStatistics.forEach(stat => {
      statsMap[`${stat.contestId}${stat.index}`.toUpperCase()] = stat.solvedCount || 0;
    });

    const candidates = [];
    for (const prob of problems) {
      if (!prob.rating || prob.rating < minRating || prob.rating > maxRating) continue;
      
      const key = `${prob.contestId}${prob.index}`.toUpperCase();
      if (solvedSet.has(key)) continue;

      const hasMatchingTag = (prob.tags || []).some(t => targetTags.includes(t));
      if (!hasMatchingTag) continue;

      candidates.push({
        problemId: `${prob.contestId}${prob.index}`,
        contestId: prob.contestId,
        index: prob.index,
        name: prob.name,
        rating: prob.rating,
        tags: prob.tags || [],
        solveCount: statsMap[key] || 0
      });
    }

    // Sort by most solved to give standard/high-quality questions
    candidates.sort((a, b) => b.solveCount - a.solveCount);

    // Pick 4 diverse questions from top 40 candidates
    const selectionSlice = candidates.slice(0, 40);
    const selected = [];
    const usedIndices = new Set();

    while (selected.length < Math.min(4, selectionSlice.length) && usedIndices.size < selectionSlice.length) {
      const randIdx = Math.floor(Math.random() * selectionSlice.length);
      if (!usedIndices.has(randIdx)) {
        usedIndices.add(randIdx);
        selected.push(selectionSlice[randIdx]);
      }
    }

    // Sort the final 4 from easiest to hardest
    selected.sort((a, b) => a.rating - b.rating);

    res.json({
      goal: req.query.goal,
      targetRatingRange: `${minRating} - ${maxRating}`,
      problems: selected
    });

  } catch (error) {
    console.error('Prep error:', error);
    res.status(500).json({ error: 'Failed to generate contest prep.' });
  }
});

export default router;
