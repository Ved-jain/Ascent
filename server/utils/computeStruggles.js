/**
 * Infers user struggle patterns from their Codeforces submission history.
 * - Struggled: Problems solved successfully, but took 3 or more failed attempts before AC.
 * - Abandoned: Problems attempted 2 or more times but never solved.
 * - Weak Tags: Tags (topics) with > 50% error rate and at least 5 total attempts.
 * 
 * @param {Array} submissions - Raw submission list from Codeforces user.status API
 * @returns {object} - Object containing struggled, abandoned, and weakTags lists
 */
export function computeStruggles(submissions) {
  const problemMap = {};

  // Group all submissions by problem ID (contestId + index)
  for (const sub of submissions) {
    if (!sub.problem || !sub.problem.contestId || !sub.problem.index) {
      continue;
    }
    const key = `${sub.problem.contestId}${sub.problem.index}`;
    if (!problemMap[key]) {
      problemMap[key] = {
        problem: sub.problem,
        attempts: [],
        solved: false,
        firstAttemptTime: sub.creationTimeSeconds,
        acTime: null,
      };
    }
    
    problemMap[key].attempts.push(sub);
    
    // Mark as solved if verdict is OK
    if (sub.verdict === 'OK' && !problemMap[key].solved) {
      problemMap[key].solved = true;
      problemMap[key].acTime = sub.creationTimeSeconds;
    }
    
    // Track earliest attempt time
    if (sub.creationTimeSeconds < problemMap[key].firstAttemptTime) {
      problemMap[key].firstAttemptTime = sub.creationTimeSeconds;
    }
  }

  const struggled = [];    // solved, but took 3+ failed attempts
  const abandoned = [];    // never solved, tried 2+ times
  const tagStats = {};     // per tag: { wa: 0, ac: 0 }

  for (const entry of Object.values(problemMap)) {
    const fails = entry.attempts.filter(s => s.verdict !== 'OK').length;

    // Track tag error rates
    for (const tag of (entry.problem.tags || [])) {
      if (!tagStats[tag]) {
        tagStats[tag] = { wa: 0, ac: 0 };
      }
      if (entry.solved) {
        tagStats[tag].ac++;
      } else {
        tagStats[tag].wa += fails;
      }
    }

    // Struggled criteria: solved, but 3 or more failed attempts
    if (entry.solved && fails >= 3) {
      const hoursToSolve = entry.acTime
        ? Math.round(((entry.acTime - entry.firstAttemptTime) / 3600) * 10) / 10
        : 0;
      struggled.push({
        problemId: `${entry.problem.contestId}${entry.problem.index}`,
        name: entry.problem.name,
        rating: entry.problem.rating || 0,
        tags: entry.problem.tags || [],
        failCount: fails,
        hoursToSolve,
      });
    }

    // Abandoned criteria: never solved, tried 2 or more times
    if (!entry.solved && fails >= 2) {
      abandoned.push({
        problemId: `${entry.problem.contestId}${entry.problem.index}`,
        name: entry.problem.name,
        rating: entry.problem.rating || 0,
        tags: entry.problem.tags || [],
        failCount: fails,
      });
    }
  }

  // Compute weak tags: tags with >50% error rate and at least 5 total attempts
  const weakTags = Object.entries(tagStats)
    .map(([tag, { wa, ac }]) => ({
      tag,
      errorRate: Math.round((wa / Math.max(wa + ac, 1)) * 100),
      totalAttempts: wa + ac,
    }))
    .filter(t => t.totalAttempts >= 5 && t.errorRate > 50)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 10);

  return {
    struggled: struggled.sort((a, b) => b.failCount - a.failCount).slice(0, 20),
    abandoned: abandoned.sort((a, b) => b.failCount - a.failCount).slice(0, 20),
    weakTags,
  };
}
