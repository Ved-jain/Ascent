import express from 'express';
import fetch from 'node-fetch';
import CFCache from '../models/CFCache.js';
import Problem from '../models/Problem.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

// Helper to seed the database if it's empty
async function seedProblemsIfEmpty() {
  const count = await Problem.countDocuments();
  if (count > 0) return;

  console.log('Seeding Problem collection from Codeforces...');
  try {
    const res = await fetch('https://codeforces.com/api/problemset.problems');
    const json = await res.json();
    if (json.status !== 'OK') throw new Error('CF API Failed');

    const { problems, problemStatistics } = json.result;
    
    // Create a map for solve counts
    const statsMap = {};
    problemStatistics.forEach(stat => {
      statsMap[`${stat.contestId}${stat.index}`] = stat.solvedCount || 0;
    });

    const docs = problems.map(p => ({
      problemId: `${p.contestId}${p.index}`,
      name: p.name,
      tags: p.tags || [],
      rating: p.rating || 0,
      solveCount: statsMap[`${p.contestId}${p.index}`] || 0
    }));

    // Insert all in bulk (this might take a few seconds on first boot)
    await Problem.insertMany(docs);
    console.log(`Seeded ${docs.length} problems successfully.`);
  } catch (err) {
    console.error('Failed to seed problems:', err);
  }
}

/**
 * Calculates the cosine similarity between a User Vector and a Problem Vector.
 * Math Explanation:
 * Cosine Similarity = (A · B) / (||A|| * ||B||)
 * 
 * @param {Object} userVector - Frequency map of user's solved tags (e.g., { dp: 5, math: 2 })
 * @param {Array<String>} problemTags - Array of tags on a problem (e.g., ['dp', 'greedy'])
 * @returns {Number} - Similarity score between 0 and 1
 */
function calculateCosineSimilarity(userVector, problemTags) {
  // 1. Build the Problem Vector
  // The problem vector is simply a frequency map of its tags. 
  // Codeforces problems usually have unique tags, so frequency is 1 for each tag present.
  const problemVector = {};
  for (const tag of problemTags) {
    problemVector[tag] = 1;
  }

  // 2. Calculate Dot Product (A · B)
  // We multiply the user's frequency for a tag by the problem's frequency for that same tag,
  // and sum these products up.
  let dotProduct = 0;
  for (const tag in problemVector) {
    if (userVector[tag]) {
      dotProduct += userVector[tag] * problemVector[tag];
    }
  }

  // If there's no overlap in tags, the vectors are completely dissimilar (score 0)
  if (dotProduct === 0) return 0;

  // 3. Calculate Magnitude of User Vector (||A||)
  // Magnitude is the square root of the sum of squared frequencies.
  let userMagnitudeSquared = 0;
  for (const tag in userVector) {
    userMagnitudeSquared += Math.pow(userVector[tag], 2);
  }
  const userMagnitude = Math.sqrt(userMagnitudeSquared);

  // 4. Calculate Magnitude of Problem Vector (||B||)
  let problemMagnitudeSquared = 0;
  for (const tag in problemVector) {
    problemMagnitudeSquared += Math.pow(problemVector[tag], 2);
  }
  const problemMagnitude = Math.sqrt(problemMagnitudeSquared);

  // 5. Calculate Final Cosine Similarity Score
  return dotProduct / (userMagnitude * problemMagnitude);
}

/**
 * GET /api/recommendations/:handle
 * Analyzes the user's solved history and uses Tag-Based Cosine Similarity 
 * to find the most relevant unsolved problems within their rating range.
 */
router.get('/:handle', authenticate, async (req, res) => {
  const handle = req.params.handle.trim().toLowerCase();

  try {
    // Ensure DB is seeded
    await seedProblemsIfEmpty();

    // 1. Retrieve the user's submission history from the cache
    const cfCache = await CFCache.findOne({ handle });
    if (!cfCache || !cfCache.submissions) {
      return res.status(404).json({ error: 'Codeforces cache not found. Sync profile first.' });
    }

    const currentRating = cfCache.userInfo?.rating || 1000;
    const submissions = cfCache.submissions;

    // 2. Vectorize the User
    // We build a frequency map of every tag the user has successfully solved.
    const userVector = {};
    const solvedSet = new Set(); // To exclude problems already solved

    for (const sub of submissions) {
      if (sub.verdict === 'OK' && sub.problem) {
        const pId = `${sub.problem.contestId}${sub.problem.index}`;
        solvedSet.add(pId);
        
        // Tally up the tags
        if (sub.problem.tags) {
          for (const tag of sub.problem.tags) {
            userVector[tag] = (userVector[tag] || 0) + 1;
          }
        }
      }
    }

    // 3. Fetch Candidate Problems from MongoDB
    // We only want unsolved problems roughly within their skill range (± 200 rating)
    const ratingMin = Math.max(800, currentRating - 100);
    const ratingMax = currentRating + 200;

    const candidates = await Problem.find({
      rating: { $gte: ratingMin, $lte: ratingMax }
    }).lean();

    // 4. Score each candidate using Cosine Similarity
    const scoredCandidates = [];

    for (const problem of candidates) {
      // Exclude if already solved
      if (solvedSet.has(problem.problemId)) continue;
      
      // Calculate similarity score
      const score = calculateCosineSimilarity(userVector, problem.tags);

      // We add a tiny weight based on global solveCount so that between two problems 
      // with identical similarity, the more standard/popular one wins.
      const adjustedScore = score + (problem.solveCount * 0.0000001);

      if (adjustedScore > 0) {
        scoredCandidates.push({
          problemId: problem.problemId,
          name: problem.name,
          rating: problem.rating,
          tags: problem.tags,
          solveCount: problem.solveCount,
          similarityScore: adjustedScore
        });
      }
    }

    // 5. Sort by similarity score descending
    scoredCandidates.sort((a, b) => b.similarityScore - a.similarityScore);

    // 6. Return the Top 5 recommendations
    const topRecommendations = scoredCandidates.slice(0, 5);

    res.json(topRecommendations);

  } catch (err) {
    console.error('Recommendation Engine Error:', err);
    res.status(500).json({ error: 'Failed to generate recommendations.' });
  }
});

export default router;
