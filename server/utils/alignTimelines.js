/**
 * Aligns a Codeforces user's contest rating history to relative "Days since start".
 * This allows comparisons based on time in the journey rather than absolute dates.
 * 
 * @param {Array} ratingHistory - Raw contest history array from user.rating API
 * @param {number} startTimestamp - Unix timestamp (in seconds) of user's first submission
 * @returns {Array} - Aligned timeline points of { day, rating }
 */
export function alignTimeline(ratingHistory, startTimestamp) {
  if (!ratingHistory || ratingHistory.length === 0) {
    return [];
  }

  const SECONDS_PER_DAY = 86400;

  return ratingHistory
    .map(contest => {
      // Calculate days since the first submission
      const daysSinceStart = Math.floor(
        (contest.ratingUpdateTimeSeconds - startTimestamp) / SECONDS_PER_DAY
      );
      return {
        day: Math.max(0, daysSinceStart),
        rating: contest.newRating,
      };
    })
    .filter(p => p.day >= 0);
}

/**
 * Finds the Unix timestamp (in seconds) of the user's first ever submission.
 * This is defined as the journey start date.
 * 
 * @param {Array} submissions - List of submissions
 * @returns {number|null} - Earliest Unix timestamp or null
 */
export function getStartDate(submissions) {
  if (!submissions || submissions.length === 0) {
    return null;
  }
  return Math.min(...submissions.map(s => s.creationTimeSeconds));
}
