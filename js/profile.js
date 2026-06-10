/* ================= STREAK CALCULATION LOGIC ================= */
function calculateStreak(checkins) {
    if (!checkins || checkins.length === 0) return 0;
    
    const dates = [...new Set(checkins.map(c => c.date))].sort();
    
    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    const todayStr = checkDate.toISOString().split('T')[0];
    
    let yesterdayDate = new Date(checkDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    if (!dates.includes(todayStr) && !dates.includes(yesterdayStr)) {
        return 0;
    }

    if (!dates.includes(todayStr) && dates.includes(yesterdayStr)) {
        checkDate = yesterdayDate;
    }

    while (true) {
        const checkStr = checkDate.toISOString().split('T')[0];
        if (dates.includes(checkStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

/* ================= INITIALIZATION & RENDER ================= */
function renderProfile() {
    // 1. Verify Profile data exists
    const profileStr = localStorage.getItem("ascent_profile");
    if (!profileStr) {
        window.location.href = "onboarding.html";
        return;
    }
    const profile = JSON.parse(profileStr);

    // Update Heading
    const userHeading = document.getElementById("user-heading");
    if (userHeading) userHeading.textContent = `${profile.leetcode}'s Journey Profile`;

    // 2. Fetch Checkins
    const checkins = JSON.parse(localStorage.getItem("ascent_checkins")) || [];

    // 3. Compute Metrics
    const totalActive = checkins.length;
    const streakCount = calculateStreak(checkins);
    
    // Breakthroughs are checkins with text notes
    const breakthroughCheckins = checkins.filter(c => c.notes && c.notes.trim().length > 0);
    const totalBreakthroughs = breakthroughCheckins.length;

    // Comparisons logged are checkins where comparison !== "No"
    const comparisonLogs = checkins.filter(c => c.comparison && c.comparison !== "No" && c.comparison !== "No, stayed focused");
    const totalComparisons = comparisonLogs.length;

    // Render summary metrics
    document.getElementById("metric-active-days").textContent = totalActive;
    document.getElementById("metric-streak").textContent = streakCount;
    document.getElementById("metric-breakthroughs").textContent = totalBreakthroughs;
    document.getElementById("metric-comparison").textContent = totalComparisons;

    // 4. Render Breakthrough Timeline (Newest first)
    const timelineContainer = document.getElementById("timeline-container");
    if (timelineContainer) {
        timelineContainer.innerHTML = "";

        if (breakthroughCheckins.length === 0) {
            timelineContainer.innerHTML = `<div class="timeline-placeholder">No breakthrough logs yet. Select obstacles and type notes in your daily reflections to build this timeline!</div>`;
        } else {
            // Sort relative day descending
            const sortedBreakthroughs = [...breakthroughCheckins].sort((a, b) => b.relativeDay - a.relativeDay);
            
            const moodEmojis = {
                "Frustrating": "😞",
                "Difficult": "😓",
                "Neutral": "😐",
                "Comfortable": "🙂",
                "Strong": "😊"
            };

            sortedBreakthroughs.forEach(c => {
                const node = document.createElement("div");
                node.className = "timeline-node";

                node.innerHTML = `
                    <div class="timeline-card">
                        <div class="timeline-meta">
                            <span class="timeline-day">Day ${c.relativeDay}</span>
                            <span class="timeline-date">${c.date}</span>
                            <span class="timeline-mood">${moodEmojis[c.mood] || "😐"} ${c.mood}</span>
                        </div>
                        <p>${c.notes}</p>
                    </div>
                `;
                timelineContainer.appendChild(node);
            });
        }
    }

    // 5. Render Comparison Trigger Bars
    const linkedinCount = checkins.filter(c => c.comparison === "LinkedIn").length;
    const leetcodeCount = checkins.filter(c => c.comparison === "LeetCode").length;
    const friendsCount = checkins.filter(c => c.comparison === "Friends").length;

    document.getElementById("linkedin-count").textContent = linkedinCount;
    document.getElementById("leetcode-count").textContent = leetcodeCount;
    document.getElementById("friends-count").textContent = friendsCount;

    const totalTriggers = linkedinCount + leetcodeCount + friendsCount;
    
    const linkedinPct = totalTriggers > 0 ? (linkedinCount / totalTriggers) * 100 : 0;
    const leetcodePct = totalTriggers > 0 ? (leetcodeCount / totalTriggers) * 100 : 0;
    const friendsPct = totalTriggers > 0 ? (friendsCount / totalTriggers) * 100 : 0;

    document.getElementById("linkedin-bar").style.width = `${linkedinPct}%`;
    document.getElementById("leetcode-bar").style.width = `${leetcodePct}%`;
    document.getElementById("friends-bar").style.width = `${friendsPct}%`;

    // 6. Generate Dynamic Coping Mindfulness Tips
    const copingTitle = document.getElementById("coping-title");
    const copingText = document.getElementById("coping-text");

    if (totalTriggers === 0) {
        copingTitle.textContent = "Mindfulness Insight";
        copingText.textContent = "Great work! You haven't reported any comparison triggers. Keep maintaining your own focus and pacing.";
    } else {
        // Find highest trigger count
        const maxVal = Math.max(linkedinCount, leetcodeCount, friendsCount);
        
        if (maxVal === linkedinCount) {
            copingTitle.textContent = "Tackling LinkedIn Outcome Anxiety";
            copingText.textContent = "LinkedIn is a professional highlights reel—it showcases outcomes, not struggles. Remember that people only post their absolute best moments, completely skipping the months of frustration behind them. When learning, consider scaling back LinkedIn usage.";
        } else if (maxVal === leetcodeCount) {
            copingTitle.textContent = "Navigating Leaderboard Pressure";
            copingText.textContent = "LeetCode ranks and solve counts don't measure understanding. Many high-solve accounts copy answers or memorize patterns rather than learning to think. Focus on your comfort level and conceptual breakthroughs, not leaderboard numbers.";
        } else {
            copingTitle.textContent = "Deconstructing Peer Comparison";
            copingText.textContent = "Your peers are running different races with different backgrounds. Comparing your Day 10 to a classmate's progress is counter-productive. Try studying collaboratively by sharing your struggles, which normalizes difficulty for both of you.";
        }
    }
}

// Initialize on load with error catch
try {
    renderProfile();
} catch (error) {
    console.error("Error rendering profile:", error);
}
