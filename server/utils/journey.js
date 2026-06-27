import { fetchUserSubmissions, fetchUserRating } from './fetchCF.js';
import JourneyCache from '../models/JourneyCache.js';

// 6 hours in milliseconds
const CACHE_TTL = 6 * 60 * 60 * 1000;

/**
 * Validates if the cache is still fresh based on the 6 hour TTL.
 */
function isCacheFresh(lastUpdated) {
  if (!lastUpdated) return false;
  return (Date.now() - new Date(lastUpdated).getTime()) < CACHE_TTL;
}

/**
 * STEP 1: Defines "Day 1" of a user's CP journey as the date of their very first CF submission.
 * Fetches from API, finds earliest submission, and caches the result.
 */
export async function getJourneyStartDate(handle) {
  const normHandle = handle.trim().toLowerCase();
  let cache = await JourneyCache.findOne({ handle: normHandle });
  
  if (cache && cache.startDate && isCacheFresh(cache.lastUpdated)) {
    console.log(`[Journey] Cache HIT for start date of ${normHandle}`);
    return cache.startDate;
  }

  console.log(`[Journey] Cache MISS/EXPIRED for start date of ${normHandle}. Fetching...`);
  const subs = await fetchUserSubmissions(normHandle);
  if (!subs || subs.length === 0) {
    throw new Error(`No submissions found for handle: ${normHandle}`);
  }

  let minTime = Infinity;
  for (const s of subs) {
    if (s.creationTimeSeconds < minTime) {
      minTime = s.creationTimeSeconds;
    }
  }

  const startDate = new Date(minTime * 1000);

  if (!cache) {
    cache = new JourneyCache({ handle: normHandle, startDate });
  } else {
    cache.startDate = startDate;
    cache.lastUpdated = new Date();
  }
  await cache.save();

  return startDate;
}

/**
 * STEP 2: Calculates how many days have elapsed since the user's journey start date.
 */
export async function getJourneyDay(handle) {
  const startDate = await getJourneyStartDate(handle);
  const diffTime = Math.abs(Date.now() - startDate.getTime());
  // Convert ms to days and floor it
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * STEP 3: Returns a historical snapshot at a specific journey day.
 * Caches the snapshot inside the JourneyCache document to avoid recalculating.
 */
export async function getSnapshotAtDay(handle, dayNumber) {
  const normHandle = handle.trim().toLowerCase();
  
  // First ensure start date exists
  const startDate = await getJourneyStartDate(normHandle);
  
  // Check if we already have this snapshot cached
  let cache = await JourneyCache.findOne({ handle: normHandle });
  if (cache && cache.snapshots && cache.snapshots.has(String(dayNumber)) && isCacheFresh(cache.lastUpdated)) {
    console.log(`[Journey] Cache HIT for snapshot day ${dayNumber} of ${normHandle}`);
    return cache.snapshots.get(String(dayNumber));
  }

  console.log(`[Journey] Cache MISS/EXPIRED for snapshot day ${dayNumber} of ${normHandle}. Calculating...`);
  
  // Calculate the target calendar date for this journey day
  const targetDate = new Date(startDate.getTime() + (dayNumber * 24 * 60 * 60 * 1000));
  const targetTimestamp = Math.floor(targetDate.getTime() / 1000);

  // Fetch full history
  const [subs, ratings] = await Promise.all([
    fetchUserSubmissions(normHandle).catch(() => []),
    fetchUserRating(normHandle).catch(() => [])
  ]);

  // Calculate Problems Solved up to target date
  const solvedSet = new Set();
  subs.forEach(s => {
    if (s.creationTimeSeconds <= targetTimestamp && s.verdict === 'OK' && s.problem) {
      solvedSet.add(`${s.problem.contestId}${s.problem.index}`);
    }
  });

  // Calculate Rating and Contests Given up to target date
  let currentRating = 0; // Default if no contests given yet
  let contestsGiven = 0;
  
  for (const r of ratings) {
    if (r.ratingUpdateTimeSeconds <= targetTimestamp) {
      currentRating = r.newRating;
      contestsGiven++;
    } else {
      break; // Ratings are chronological, so we can stop
    }
  }

  const snapshot = {
    rating: currentRating,
    problemsSolved: solvedSet.size,
    contestsGiven,
    journeyDay: dayNumber,
    calendarDate: targetDate
  };

  // Cache it
  if (!cache.snapshots) cache.snapshots = new Map();
  cache.snapshots.set(String(dayNumber), snapshot);
  cache.lastUpdated = new Date();
  await cache.save();

  return snapshot;
}

/**
 * STEP 4: Compares two users based on MY current journey day.
 */
export async function compareJourneys(myHandle, peerHandle) {
  const normMe = myHandle.trim().toLowerCase();
  const normPeer = peerHandle.trim().toLowerCase();

  const myCurrentDay = await getJourneyDay(normMe);
  
  const [mySnapshot, peerSnapshot] = await Promise.all([
    getSnapshotAtDay(normMe, myCurrentDay),
    getSnapshotAtDay(normPeer, myCurrentDay)
  ]);

  const diffRating = mySnapshot.rating - peerSnapshot.rating;
  const diffProblems = mySnapshot.problemsSolved - peerSnapshot.problemsSolved;
  const diffContests = mySnapshot.contestsGiven - peerSnapshot.contestsGiven;

  // Auto-generate human readable, positive, motivational insight
  let insight = `On ${normPeer}'s day ${myCurrentDay}, they had achieved a rating of ${peerSnapshot.rating} with ${peerSnapshot.problemsSolved} problems solved. `;
  
  if (diffRating > 0) {
    insight += `You are currently at ${mySnapshot.rating} rating. Outstanding work! You are tracking ${diffRating} points ahead of their historical pace. Keep the momentum going!`;
  } else if (diffRating < 0) {
    insight += `You are currently at ${mySnapshot.rating} rating. You're building an incredible foundation! They prove what's possible from this exact point in your journey—stay consistent and you'll close that ${Math.abs(diffRating)} point gap in no time!`;
  } else {
    insight += `You are currently at ${mySnapshot.rating} rating. Incredible! You are perfectly matching their historical trajectory pace-for-pace.`;
  }

  return {
    myHandle: normMe,
    peerHandle: normPeer,
    journeyDay: myCurrentDay,
    me: mySnapshot,
    peer: peerSnapshot,
    difference: {
      rating: diffRating,
      problemsSolved: diffProblems,
      contestsGiven: diffContests
    },
    insight
  };
}

/**
 * STEP 5: Returns the full rating progression mapped by relative journey day.
 */
export async function getJourneyTimeline(handle) {
  const normHandle = handle.trim().toLowerCase();
  
  let cache = await JourneyCache.findOne({ handle: normHandle });
  if (cache && cache.timeline && cache.timeline.length > 0 && isCacheFresh(cache.lastUpdated)) {
    console.log(`[Journey] Cache HIT for timeline of ${normHandle}`);
    return cache.timeline;
  }

  console.log(`[Journey] Cache MISS/EXPIRED for timeline of ${normHandle}. Calculating...`);
  const startDate = await getJourneyStartDate(normHandle);
  const ratings = await fetchUserRating(normHandle).catch(() => []);

  const timeline = ratings.map(r => {
    const rDate = new Date(r.ratingUpdateTimeSeconds * 1000);
    const diffTime = Math.abs(rDate.getTime() - startDate.getTime());
    const day = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      day,
      rating: r.newRating,
      date: rDate.toISOString()
    };
  });

  // Ensure day 1 exists
  if (timeline.length === 0 || timeline[0].day > 0) {
    timeline.unshift({
      day: 0,
      rating: 0, // Unrated on day 0
      date: startDate.toISOString()
    });
  }

  // Cache timeline
  if (!cache) {
    cache = new JourneyCache({ handle: normHandle, startDate });
  }
  cache.timeline = timeline;
  cache.lastUpdated = new Date();
  await cache.save();

  return timeline;
}

/**
 * STEP 6: Predicts when I will reach a target milestone based on my pace and peer's history.
 */
export async function predictMilestone(myHandle, peerHandle, targetRatingStr) {
  const normMe = myHandle.trim().toLowerCase();
  const normPeer = peerHandle.trim().toLowerCase();
  const targetRating = parseInt(targetRatingStr, 10);

  const [myTimeline, peerTimeline] = await Promise.all([
    getJourneyTimeline(normMe),
    getJourneyTimeline(normPeer)
  ]);

  const myCurrentDay = await getJourneyDay(normMe);
  const myCurrentRatingObj = myTimeline[myTimeline.length - 1];
  const myCurrentRating = myCurrentRatingObj ? myCurrentRatingObj.rating : 0;

  if (myCurrentRating >= targetRating) {
    return {
      currentRating: myCurrentRating,
      targetRating,
      peerDaysToTarget: 0,
      myPredictedDays: 0,
      myPredictedDate: new Date(),
      confidence: 'high',
      alreadyReached: true
    };
  }

  // 1. Find when peer hit my current rating
  let peerDayAtMyRating = 0;
  for (const pt of peerTimeline) {
    if (pt.rating >= myCurrentRating) {
      peerDayAtMyRating = pt.day;
      break;
    }
  }

  // 2. Find when peer hit target rating
  let peerDayAtTarget = -1;
  for (const pt of peerTimeline) {
    if (pt.rating >= targetRating) {
      peerDayAtTarget = pt.day;
      break;
    }
  }

  const peerDaysToTarget = peerDayAtTarget !== -1 ? peerDayAtTarget - peerDayAtMyRating : null;

  // 3. Calculate my pace (points per day)
  let myPace = myCurrentRating / (myCurrentDay || 1);
  if (myPace <= 0) myPace = 0.5; // fallback pace if unrated

  let myPredictedDays = Math.ceil((targetRating - myCurrentRating) / myPace);

  // Determine confidence
  let confidence = 'medium';
  if (myTimeline.length > 10) confidence = 'high';
  else if (myTimeline.length < 3) confidence = 'low';

  const myPredictedDate = new Date(Date.now() + (myPredictedDays * 24 * 60 * 60 * 1000));

  return {
    currentRating: myCurrentRating,
    targetRating,
    peerDaysToTarget,
    myPredictedDays,
    myPredictedDate,
    confidence,
    peerReached: peerDayAtTarget !== -1
  };
}

/**
 * STAGE 6: Struggle Analysis
 */

export async function getRatingDrops(handle, upToDay) {
  const normHandle = handle.trim().toLowerCase();
  const timeline = await getJourneyTimeline(normHandle);
  
  const drops = [];
  const validTimeline = timeline.filter(t => t.day <= upToDay);

  for (let i = 1; i < validTimeline.length; i++) {
    const prev = validTimeline[i-1];
    const curr = validTimeline[i];
    
    if (curr.rating < prev.rating) {
      const dropAmount = prev.rating - curr.rating;
      
      let recoveryDay = null;
      for (let j = i + 1; j < timeline.length; j++) {
        if (timeline[j].rating >= prev.rating) {
          recoveryDay = timeline[j].day;
          break;
        }
      }
      
      const recoveryDays = recoveryDay !== null ? recoveryDay - curr.day : null;
      
      drops.push({
        day: curr.day,
        dropAmount,
        recoveryDays
      });
    }
  }
  return drops;
}

export async function getContestGaps(handle, upToDay) {
  const normHandle = handle.trim().toLowerCase();
  const timeline = await getJourneyTimeline(normHandle);
  
  const validTimeline = timeline.filter(t => t.day <= upToDay);
  const gaps = [];
  
  for (let i = 1; i < validTimeline.length; i++) {
    const gapDays = validTimeline[i].day - validTimeline[i-1].day;
    if (gapDays > 14) {
      gaps.push({
        startDay: validTimeline[i-1].day,
        endDay: validTimeline[i].day,
        gapDays
      });
    }
  }
  return gaps;
}

export async function getPlateauPeriods(handle, upToDay) {
  const normHandle = handle.trim().toLowerCase();
  const timeline = await getJourneyTimeline(normHandle);
  const validTimeline = timeline.filter(t => t.day <= upToDay);
  
  const plateaus = [];
  
  for (let i = 0; i < validTimeline.length; i++) {
    let maxR = validTimeline[i].rating;
    let minR = validTimeline[i].rating;
    let j = i;
    
    while (j < validTimeline.length) {
      maxR = Math.max(maxR, validTimeline[j].rating);
      minR = Math.min(minR, validTimeline[j].rating);
      if (maxR - minR > 100) break;
      j++;
    }
    j--;
    
    if (j > i) {
      const plateauDays = validTimeline[j].day - validTimeline[i].day;
      if (plateauDays >= 30) {
        const overlap = plateaus.find(p => p.endDay >= validTimeline[i].day);
        if (!overlap) {
          plateaus.push({
            startDay: validTimeline[i].day,
            endDay: validTimeline[j].day,
            plateauDays,
            ratingRange: maxR - minR
          });
        }
      }
    }
  }
  return plateaus;
}

export async function getConsistencyScore(handle, upToDay) {
  const normHandle = handle.trim().toLowerCase();
  const subs = await fetchUserSubmissions(normHandle).catch(() => []);
  const startDate = await getJourneyStartDate(normHandle);
  
  const targetTimestamp = Math.floor(startDate.getTime() / 1000) + (upToDay * 24 * 60 * 60);
  const activeDaysSet = new Set();
  
  subs.forEach(s => {
    if (s.verdict === 'OK' && s.creationTimeSeconds <= targetTimestamp && s.creationTimeSeconds >= Math.floor(startDate.getTime() / 1000)) {
      const diffTime = (s.creationTimeSeconds * 1000) - startDate.getTime();
      const jDay = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (jDay >= 0 && jDay <= upToDay) {
        activeDaysSet.add(jDay);
      }
    }
  });
  
  const activeDays = Array.from(activeDaysSet).sort((a,b) => a - b);
  const weeks = Math.max(1, upToDay / 7);
  const avgActiveDaysPerWeek = activeDays.length / weeks;
  
  let longestStreak = 0;
  let currentStreak = 0;
  let longestGap = 0;
  
  if (activeDays.length > 0) {
    currentStreak = 1;
    longestStreak = 1;
    for (let i = 1; i < activeDays.length; i++) {
      const diff = activeDays[i] - activeDays[i-1];
      if (diff === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
      if (diff > 1) {
        longestGap = Math.max(longestGap, diff - 1);
      }
    }
  } else {
    longestGap = upToDay;
  }
  
  if (activeDays.length > 0) {
    longestGap = Math.max(longestGap, activeDays[0]);
    longestGap = Math.max(longestGap, upToDay - activeDays[activeDays.length - 1]);
  }
  
  return {
    avgActiveDaysPerWeek: parseFloat(avgActiveDaysPerWeek.toFixed(2)),
    longestStreak,
    longestGap,
    totalActiveDays: activeDays.length
  };
}

export async function getDifficultyProgression(handle, upToDay) {
  const normHandle = handle.trim().toLowerCase();
  const subs = await fetchUserSubmissions(normHandle).catch(() => []);
  const startDate = await getJourneyStartDate(normHandle);
  
  const targetTimestamp = Math.floor(startDate.getTime() / 1000) + (upToDay * 24 * 60 * 60);
  const windows = {};
  
  subs.forEach(s => {
    if (s.verdict === 'OK' && s.problem && s.problem.rating && s.creationTimeSeconds <= targetTimestamp && s.creationTimeSeconds >= Math.floor(startDate.getTime() / 1000)) {
      const diffTime = (s.creationTimeSeconds * 1000) - startDate.getTime();
      const jDay = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (jDay >= 0 && jDay <= upToDay) {
        const windowIdx = Math.floor(jDay / 30);
        if (!windows[windowIdx]) windows[windowIdx] = [];
        windows[windowIdx].push(s.problem.rating);
      }
    }
  });
  
  const progression = [];
  const maxWindows = Math.floor(upToDay / 30);
  
  for (let i = 0; i <= maxWindows; i++) {
    const ratings = windows[i] || [];
    let avgProblemRating = 0;
    let maxProblemRating = 0;
    if (ratings.length > 0) {
      avgProblemRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      maxProblemRating = Math.max(...ratings);
    }
    progression.push({
      windowIdx: i,
      dayRange: `Day ${i*30}-${(i+1)*30-1}`,
      month: i + 1,
      avgProblemRating: Math.round(avgProblemRating),
      maxProblemRating,
      solvedCount: ratings.length
    });
  }
  return progression;
}

export async function compareStruggles(myHandle, peerHandle) {
  const normMe = myHandle.trim().toLowerCase();
  const normPeer = peerHandle.trim().toLowerCase();

  const myCurrentDay = await getJourneyDay(normMe);
  
  const [
    meDrops, meGaps, mePlateaus, meConsistency, meProgression,
    peerDrops, peerGaps, peerPlateaus, peerConsistency, peerProgression
  ] = await Promise.all([
    getRatingDrops(normMe, myCurrentDay),
    getContestGaps(normMe, myCurrentDay),
    getPlateauPeriods(normMe, myCurrentDay),
    getConsistencyScore(normMe, myCurrentDay),
    getDifficultyProgression(normMe, myCurrentDay),
    getRatingDrops(normPeer, myCurrentDay),
    getContestGaps(normPeer, myCurrentDay),
    getPlateauPeriods(normPeer, myCurrentDay),
    getConsistencyScore(normPeer, myCurrentDay),
    getDifficultyProgression(normPeer, myCurrentDay)
  ]);
  
  const avgMeDrop = meDrops.length > 0 ? Math.round(meDrops.reduce((s,d) => s + d.dropAmount, 0) / meDrops.length) : 0;
  const avgPeerDrop = peerDrops.length > 0 ? Math.round(peerDrops.reduce((s,d) => s + d.dropAmount, 0) / peerDrops.length) : 0;
  
  const insights = [];
  
  if (peerDrops.length > meDrops.length) {
    insights.push(`Even ${normPeer} struggled at this stage. They had ${peerDrops.length} rating drops (avg -${avgPeerDrop} pts) while you've only had ${meDrops.length}. You are remarkably resilient.`);
  } else if (meDrops.length > 0) {
    insights.push(`You've experienced ${meDrops.length} rating drops (avg -${avgMeDrop} pts), but remember: every drop is data, not failure. ${normPeer} had ${peerDrops.length} drops by this point and still succeeded.`);
  } else {
    insights.push(`You haven't had any major rating drops yet! That's incredible consistency.`);
  }

  if (mePlateaus.length > 0) {
    const myCurrentPlateau = mePlateaus.find(p => p.endDay >= myCurrentDay - 10);
    if (myCurrentPlateau) {
      if (peerPlateaus.length > 0) {
        insights.push(`You might be in a plateau right now. Don't worry—${normPeer} had a similar plateau at day ${peerPlateaus[0].startDay} that lasted ${peerPlateaus[0].plateauDays} days. They broke through, and so will you.`);
      } else {
        insights.push(`You might be in a plateau right now. This is completely normal in competitive programming. Pushing your problem difficulty higher is the key to breaking it.`);
      }
    }
  }

  if (meConsistency.longestStreak > peerConsistency.longestStreak) {
    insights.push(`Your longest daily solving streak (${meConsistency.longestStreak} days) is actually longer than ${normPeer}'s was (${peerConsistency.longestStreak} days). Your discipline is top-tier.`);
  } else if (peerConsistency.longestStreak > 0) {
    insights.push(`${normPeer} had a massive ${peerConsistency.longestStreak} day solving streak. Consistency is their secret weapon. Try to build a daily habit!`);
  } else {
    insights.push(`Both you and ${normPeer} are steadily building consistency. Every problem counts!`);
  }

  return {
    myHandle: normMe,
    peerHandle: normPeer,
    journeyDay: myCurrentDay,
    me: {
      ratingDrops: meDrops,
      avgDrop: avgMeDrop,
      contestGaps: meGaps,
      plateaus: mePlateaus,
      consistency: meConsistency,
      difficultyProgression: meProgression
    },
    peer: {
      ratingDrops: peerDrops,
      avgDrop: avgPeerDrop,
      contestGaps: peerGaps,
      plateaus: peerPlateaus,
      consistency: peerConsistency,
      difficultyProgression: peerProgression
    },
    insights
  };
}
