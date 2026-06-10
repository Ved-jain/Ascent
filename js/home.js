/* ================= MOCK COMMUNITY DATA ================= */
const journeys = [
    {
        name: "Aryan",
        topic: "Graphs",
        duration: "4 Weeks",
        struggle: "Understanding DFS vs BFS",
        breakthrough: "Graph Traversals",
        moods: ["😞","😓","😐","🙂","😊"],
        story: "Struggled with Graphs for 3 weeks before finally understanding traversal patterns."
    },
    {
        name: "Saket",
        topic: "Binary Search",
        duration: "2 Weeks",
        struggle: "Off-by-one edge cases",
        breakthrough: "Left & Right Pointers",
        moods: ["😞","😞","😓","🙂","😊"],
        story: "Binary Search finally clicked after solving 15 questions."
    },
    {
        name: "Harsh",
        topic: "Dynamic Programming",
        duration: "5 Weeks",
        struggle: "Identifying subproblems",
        breakthrough: "Memoization",
        moods: ["😞","😞","😞","😓","😐"],
        story: "Still struggling with state transitions but making steady progress."
    }
];

/* ================= STATE & DOM ELEMENTS ================= */
let currentIndex = 0;

const elements = {
    // Spotlight Elements
    spotlightName: document.getElementById("journey-name"),
    spotlightTopic: document.getElementById("journey-topic"),
    spotlightMoods: document.getElementById("journey-moods"),
    spotlightStory: document.getElementById("journey-story"),
    spotlightDuration: document.getElementById("journey-duration"),
    spotlightStruggle: document.getElementById("journey-struggle"),
    spotlightBreakthrough: document.getElementById("journey-breakthrough"),
    spotlightCounter: document.getElementById("journey-counter"),
    nextBtn: document.getElementById("next-btn"),
    prevBtn: document.getElementById("prev-btn"),

    // Dashboard Stats Elements
    welcomeTitle: document.getElementById("welcome-title"),
    journeyDayLabel: document.getElementById("journey-day-label"),
    activeDays: document.getElementById("active-days"),
    currentStreak: document.getElementById("current-streak"),
    problemsSolved: document.getElementById("problems-solved"),
    focusTopic: document.getElementById("focus-topic"),
    focusProgress: document.getElementById("focus-progress"),
    focusLastActivity: document.getElementById("focus-last-activity"),
    heatmap: document.getElementById("heatmap")
};

/* ================= STREAK CALCULATION LOGIC ================= */
function calculateStreak(checkins) {
    if (!checkins || checkins.length === 0) return 0;
    
    // Extract unique sorted date strings (YYYY-MM-DD)
    const dates = [...new Set(checkins.map(c => c.date))].sort();
    
    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0); // Start check from today

    const todayStr = checkDate.toISOString().split('T')[0];
    
    // Yesterday
    let yesterdayDate = new Date(checkDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    // Check if user has logged today or yesterday. If neither, streak is 0
    if (!dates.includes(todayStr) && !dates.includes(yesterdayStr)) {
        return 0;
    }

    // If checked in today, begin tracing back from today. Else trace back from yesterday.
    if (!dates.includes(todayStr) && dates.includes(yesterdayStr)) {
        checkDate = yesterdayDate;
    }

    while (true) {
        const checkStr = checkDate.toISOString().split('T')[0];
        if (dates.includes(checkStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1); // Go back 1 day
        } else {
            break;
        }
    }
    return streak;
}

/* ================= FUNCTIONS ================= */

// Updates Dashboard Metrics using LocalStorage data
function renderDashboard() {
    // 1. Verify Profile data exists. If not, redirect to onboarding.
    const profileStr = localStorage.getItem("ascent_profile");
    if (!profileStr) {
        window.location.href = "onboarding.html";
        return;
    }
    const profile = JSON.parse(profileStr);

    // Calculate relative day
    const start = new Date(profile.startDate);
    const now = new Date();
    const diffTime = Math.abs(now - start);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Display values
    if (elements.welcomeTitle) {
        elements.welcomeTitle.textContent = `Good Evening, ${profile.leetcode} 👋`;
    }
    if (elements.journeyDayLabel) {
        elements.journeyDayLabel.textContent = `Day ${diffDays} of your journey.`;
    }

    // 2. Fetch Checkins
    const checkins = JSON.parse(localStorage.getItem("ascent_checkins")) || [];

    // Calculate Active Days & Streak
    const totalActive = checkins.length;
    const activeStreak = calculateStreak(checkins);
    
    // Compute simulated solved count (e.g. baseline of 50 solves, plus 3 solved per logged reflection)
    const baseSolves = 50 + (totalActive * 3);

    if (elements.activeDays) elements.activeDays.textContent = totalActive;
    if (elements.currentStreak) elements.currentStreak.textContent = activeStreak;
    if (elements.problemsSolved) elements.problemsSolved.textContent = baseSolves;

    // 3. Render Focus details
    if (checkins.length > 0) {
        const latest = checkins[checkins.length - 1];
        if (elements.focusTopic) {
            elements.focusTopic.textContent = latest.focusTopic || "Dynamic Programming";
        }
        if (elements.focusProgress) {
            // Compute dynamic progress (baseline of 10% + 5% per checkin, capped at 100%)
            const progress = Math.min(10 + (totalActive * 5), 100);
            elements.focusProgress.textContent = `Progress: ${progress}%`;
        }
        if (elements.focusLastActivity) {
            elements.focusLastActivity.textContent = `Last Activity: Today`;
        }
    } else {
        // Fallback placeholders for brand new journeys
        if (elements.focusTopic) elements.focusTopic.textContent = "Dynamic Programming";
        if (elements.focusProgress) elements.focusProgress.textContent = "Progress: 10%";
        if (elements.focusLastActivity) elements.focusLastActivity.textContent = "Last Activity: None";
    }

    // 4. Render Calendar Heatmap (Last 30 Days)
    if (elements.heatmap) {
        elements.heatmap.innerHTML = "";

        // Map date -> mood
        const moodMap = {};
        checkins.forEach(c => {
            moodMap[c.date] = c.mood;
        });

        // Loop through last 30 days chronologically
        for (let i = 29; i >= 0; i--) {
            const checkDate = new Date();
            checkDate.setDate(checkDate.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];

            const cell = document.createElement("div");
            cell.classList.add("cell");

            const mood = moodMap[dateStr];
            if (mood) {
                if (mood === "Strong" || mood === "Comfortable") {
                    cell.classList.add("good-day");
                    cell.setAttribute("data-tooltip", `${dateStr}: Good Day (${mood})`);
                } else if (mood === "Neutral" || mood === "Difficult") {
                    cell.classList.add("difficult-day");
                    cell.setAttribute("data-tooltip", `${dateStr}: Hard Day (${mood})`);
                } else if (mood === "Frustrating") {
                    cell.classList.add("frustrating-day");
                    cell.setAttribute("data-tooltip", `${dateStr}: Frustrating Day`);
                }
            } else {
                cell.classList.add("no-activity");
                cell.setAttribute("data-tooltip", `${dateStr}: No Activity`);
            }
            elements.heatmap.appendChild(cell);
        }
    }
}

// Populates UI with data for the currently selected community journey spotlight
function updateSpotlight() {
    if (!journeys || journeys.length === 0) return;
    
    const currentJourney = journeys[currentIndex];

    if (elements.spotlightName) elements.spotlightName.textContent = currentJourney.name;
    if (elements.spotlightTopic) elements.spotlightTopic.textContent = currentJourney.topic;
    if (elements.spotlightDuration) elements.spotlightDuration.textContent = currentJourney.duration;
    if (elements.spotlightStruggle) elements.spotlightStruggle.textContent = currentJourney.struggle;
    if (elements.spotlightBreakthrough) elements.spotlightBreakthrough.textContent = currentJourney.breakthrough;
    if (elements.spotlightStory) elements.spotlightStory.textContent = currentJourney.story;
    if (elements.spotlightCounter) elements.spotlightCounter.textContent = `${currentIndex + 1} / ${journeys.length}`;

    if (elements.spotlightMoods) {
        elements.spotlightMoods.innerHTML = "";
        const moodNameMap = {
            "😞": "Frustrating",
            "😓": "Difficult",
            "😐": "Neutral",
            "🙂": "Comfortable",
            "😊": "Strong"
        };

        currentJourney.moods.forEach((mood, index) => {
            const span = document.createElement("span");
            span.textContent = mood;
            span.className = "journey-step";
            span.setAttribute("data-tooltip", moodNameMap[mood] || "Mood");
            elements.spotlightMoods.appendChild(span);

            if (index < currentJourney.moods.length - 1) {
                const arrow = document.createElement("span");
                arrow.textContent = "→";
                arrow.className = "journey-arrow";
                elements.spotlightMoods.appendChild(arrow);
            }
        });
    }
}

/* ================= EVENT LISTENERS ================= */
if (elements.nextBtn) {
    elements.nextBtn.addEventListener("click", () => {
        currentIndex = (currentIndex + 1) % journeys.length;
        updateSpotlight();
    });
}

if (elements.prevBtn) {
    elements.prevBtn.addEventListener("click", () => {
        currentIndex = (currentIndex - 1 + journeys.length) % journeys.length;
        updateSpotlight();
    });
}

/* ================= INITIALIZATION ================= */
function init() {
    renderDashboard();
    updateSpotlight();
}

init();