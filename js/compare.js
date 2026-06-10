/* ================= MOCK PEER TIMELINE DATA ================= */
const profiles = {
    Aryan: {
        name: "Aryan",
        currentDay: 90,
        timeline: {
            1: { solves: 1, moodEmoji: "😞", moodText: "Frustrating", topic: "Arrays", struggle: "Syntax errors and IDE setup", breakthrough: "None" },
            2: { solves: 2, moodEmoji: "😞", moodText: "Frustrating", topic: "Arrays", struggle: "Understanding index starting at 0", breakthrough: "None" },
            3: { solves: 3, moodEmoji: "😓", moodText: "Difficult", topic: "Arrays", struggle: "Nested loops complexity O(N^2)", breakthrough: "None" },
            4: { solves: 4, moodEmoji: "😐", moodText: "Neutral", topic: "Two Pointers", struggle: "Pointers overlapping bugs", breakthrough: "None" },
            5: { solves: 6, moodEmoji: "😞", moodText: "Frustrating", topic: "Binary Search", struggle: "Mid calculation index overflow", breakthrough: "None" },
            6: { solves: 9, moodEmoji: "😓", moodText: "Difficult", topic: "Binary Search", struggle: "Condition for target in search space", breakthrough: "None" },
            7: { solves: 12, moodEmoji: "😞", moodText: "Frustrating", topic: "Sliding Window", struggle: "Tracking minimum length window", breakthrough: "None" },
            8: { solves: 15, moodEmoji: "😐", moodText: "Neutral", topic: "Sliding Window", struggle: "Shrinking logic when match found", breakthrough: "Solved small window problems" },
            9: { solves: 18, moodEmoji: "😞", moodText: "Frustrating", topic: "Linked Lists", struggle: "Reverse nodes double pointer swapping", breakthrough: "None" },
            10: { solves: 20, moodEmoji: "😓", moodText: "Difficult", topic: "Trees", struggle: "Recursion base case return rules", breakthrough: "Writing recursive print paths" },
            11: { solves: 24, moodEmoji: "😓", moodText: "Difficult", topic: "Trees & BFS", struggle: "Visualizing queue pop ordering", breakthrough: "None" },
            12: { solves: 28, moodEmoji: "😞", moodText: "Frustrating", topic: "Dynamic Programming", struggle: "Grid paths bottom right combinations", breakthrough: "None" },
            13: { solves: 31, moodEmoji: "😞", moodText: "Frustrating", topic: "Dynamic Programming", struggle: "Tabulation table initialization", breakthrough: "None" },
            14: { solves: 35, moodEmoji: "😞", moodText: "Frustrating", topic: "Dynamic Programming", struggle: "Grid travel recursive states", breakthrough: "None - DP is impossible" }
        }
    },
    Saket: {
        name: "Saket",
        currentDay: 45,
        timeline: {
            1: { solves: 3, moodEmoji: "😐", moodText: "Neutral", topic: "Math & Arrays", struggle: "Modulo operations in logic", breakthrough: "None" },
            2: { solves: 6, moodEmoji: "🙂", moodText: "Comfortable", topic: "Arrays", struggle: "Sum array ranges O(N) constraints", breakthrough: "Prefix sum array concept" },
            3: { solves: 9, moodEmoji: "🙂", moodText: "Comfortable", topic: "Two Pointers", struggle: "Handling duplicate numbers", breakthrough: "None" },
            4: { solves: 12, moodEmoji: "😐", moodText: "Neutral", topic: "Two Pointers", struggle: "Pointer increments offset errors", breakthrough: "None" },
            5: { solves: 18, moodEmoji: "🙂", moodText: "Comfortable", topic: "Two Pointers", struggle: "Three sum pointer logic complexity", breakthrough: "Solved Three Sum" },
            6: { solves: 20, moodEmoji: "😐", moodText: "Neutral", topic: "Binary Search", struggle: "Search in rotated sorted array bounds", breakthrough: "None" },
            7: { solves: 23, moodEmoji: "😓", moodText: "Difficult", topic: "Binary Search", struggle: "Checking rotated pivot logic", breakthrough: "Understood pivot partition search" },
            8: { solves: 25, moodEmoji: "😐", moodText: "Neutral", topic: "Sliding Window", struggle: "Index map duplicate tracker tracking", breakthrough: "None" },
            9: { solves: 28, moodEmoji: "😞", moodText: "Frustrating", topic: "Linked Lists", struggle: "Detecting loop in list node pointers", breakthrough: "None" },
            10: { solves: 30, moodEmoji: "😓", moodText: "Difficult", topic: "Stacks & Queues", struggle: "Monotonic stack increasing element pattern", breakthrough: "None" },
            11: { solves: 34, moodEmoji: "😐", moodText: "Neutral", topic: "Stacks & Queues", struggle: "Min stack O(1) tracking using double stacks", breakthrough: "Solved Min Stack" },
            12: { solves: 38, moodEmoji: "😓", moodText: "Difficult", topic: "Trees", struggle: "Validating Binary Search Tree constraints", breakthrough: "None" },
            13: { solves: 42, moodEmoji: "🙂", moodText: "Comfortable", topic: "Trees", struggle: "Inorder traversal storage lists", breakthrough: "Iterative tree traversal" },
            14: { solves: 50, moodEmoji: "😐", moodText: "Neutral", topic: "Dynamic Programming", struggle: "Fibonacci array size storage", breakthrough: "Iterative DP bottom-up" }
        }
    },
    // Fallback Ved Timeline (used only if user has no localStorage entries)
    VedFallbackTimeline: {
        1: { solves: 2, moodEmoji: "😞", moodText: "Frustrating", topic: "Arrays", struggle: "Off-by-one errors in index loops", breakthrough: "None" },
        2: { solves: 5, moodEmoji: "😓", moodText: "Difficult", topic: "Arrays", struggle: "Understanding 2D matrix traversal", breakthrough: "None" },
        3: { solves: 8, moodEmoji: "😐", moodText: "Neutral", topic: "Two Pointers", struggle: "Moving pointers in opposite directions", breakthrough: "Solved Two Sum in O(N)" },
        4: { solves: 10, moodEmoji: "🙂", moodText: "Comfortable", topic: "Two Pointers", struggle: "Optimizing left/right bounds", breakthrough: "Understood Sorted Two Sum" },
        5: { solves: 12, moodEmoji: "😓", moodText: "Difficult", topic: "Binary Search", struggle: "Infinite loops in while(l < r)", breakthrough: "None" },
        6: { solves: 15, moodEmoji: "🙂", moodText: "Comfortable", topic: "Binary Search", struggle: "Finding first/last position of element", breakthrough: "Visualized division bounds" },
        7: { solves: 18, moodEmoji: "😐", moodText: "Neutral", topic: "Sliding Window", struggle: "Varying size windows indexing", breakthrough: "None" },
        8: { solves: 22, moodEmoji: "🙂", moodText: "Comfortable", topic: "Sliding Window", struggle: "Managing dictionary states in substring", breakthrough: "Solved Maximum Subarray O(N)" },
        9: { solves: 30, moodEmoji: "😓", moodText: "Difficult", topic: "Linked Lists", struggle: "Pointer manipulation & losing nodes", breakthrough: "None" },
        10: { solves: 45, moodEmoji: "😐", moodText: "Neutral", topic: "Trees", struggle: "Recursion stack visualization", breakthrough: "Finally got DFS preorder traversal" },
        11: { solves: 55, moodEmoji: "🙂", moodText: "Comfortable", topic: "Trees & BFS", struggle: "Level order queue structure", breakthrough: "Implemented queue traversal" },
        12: { solves: 64, moodEmoji: "😓", moodText: "Difficult", topic: "Dynamic Programming", struggle: "Recursive relation identification", breakthrough: "None" },
        13: { solves: 72, moodEmoji: "😐", moodText: "Neutral", topic: "Dynamic Programming", struggle: "State overlaps and complexity limits", breakthrough: "Drew DP recursion tree" },
        14: { solves: 84, moodEmoji: "🙂", moodText: "Comfortable", topic: "Dynamic Programming", struggle: "Finding overlapping subproblems", breakthrough: "Understood Top-Down Memoization cache!" }
    }
};

/* ================= STATE & USER LOADER ================= */
let userProfile = { name: "Ved", currentDay: 14 };

// Load profile & checkins dynamically
const profileStr = localStorage.getItem("ascent_profile");
const checkins = JSON.parse(localStorage.getItem("ascent_checkins")) || [];

if (profileStr) {
    const profile = JSON.parse(profileStr);
    userProfile.name = profile.leetcode;
    
    // Compute current relative day
    const start = new Date(profile.startDate);
    const diffTime = Math.abs(new Date() - start);
    userProfile.currentDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// Build user timeline combining actual checkins + fallbacks
const userTimeline = {};
const moodEmojis = {
    "Frustrating": "😞",
    "Difficult": "😓",
    "Neutral": "😐",
    "Comfortable": "🙂",
    "Strong": "😊"
};

// We support viewing relative timeline days up to their current day (or at least 14 days)
const totalTimelineDays = Math.max(userProfile.currentDay, 14);

for (let day = 1; day <= totalTimelineDays; day++) {
    // Check if user has a real checkin for this relativeDay
    const realCheckin = checkins.find(c => c.relativeDay === day);
    
    if (realCheckin) {
        userTimeline[day] = {
            solves: 50 + (day * 3), // Emulated solve progression
            moodEmoji: moodEmojis[realCheckin.mood] || "😐",
            moodText: realCheckin.mood,
            topic: "Dynamic Programming", // Default focus
            struggle: realCheckin.notes || "No specific struggle logged today.",
            breakthrough: realCheckin.obstacles.length > 0 
                ? `Logged obstacles with: ${realCheckin.obstacles.join(', ')}`
                : "No blockers logged today."
        };
    } else {
        // Fall back to mock timeline
        userTimeline[day] = profiles.VedFallbackTimeline[day] || {
            solves: 50 + (day * 3),
            moodEmoji: "😐",
            moodText: "Neutral",
            topic: "Dynamic Programming",
            struggle: "Still learning the basics of state transitions.",
            breakthrough: "Steady incremental practice."
        };
    }
}

/* ================= DOM SELECTORS ================= */
const peerSelect = document.getElementById("peer-select");
const daySlider = document.getElementById("day-slider");
const dayDisplay = document.getElementById("day-display");

// Setup slider bounds based on user's current day
daySlider.max = userProfile.currentDay;
const sliderMaxSpan = document.querySelector(".slider-bounds span:last-child");
if (sliderMaxSpan) sliderMaxSpan.textContent = `Day ${userProfile.currentDay}`;

// User elements selectors
const userNameLabel = document.querySelector(".user-card h3");
const userSolves = document.getElementById("user-solves");
const userComfortEmoji = document.querySelector(".user-card .comfort-display .emoji");
const userComfortText = document.querySelector(".user-card .comfort-display .text");
const userTopic = document.getElementById("user-topic");
const userStruggle = document.getElementById("user-struggle");
const userBreakthrough = document.getElementById("user-breakthrough");

// Peer elements selectors
const peerName = document.getElementById("peer-name");
const peerDayDisplays = document.querySelectorAll(".peer-day-display");
const peerSolves = document.getElementById("peer-solves");
const peerComfortEmoji = document.querySelector(".peer-card .comfort-display .emoji");
const peerComfortText = document.querySelector(".peer-card .comfort-display .text");
const peerTopic = document.getElementById("peer-topic");
const peerStruggle = document.getElementById("peer-struggle");
const peerBreakthrough = document.getElementById("peer-breakthrough");

// Insight panel elements
const insightText = document.getElementById("insight-text");

/* ================= RENDER ENGINE ================= */
function renderComparison() {
    // If the slider value exceeds userProfile.currentDay (due to changes), clamp it
    let relativeDay = parseInt(daySlider.value, 10);
    if (relativeDay > userProfile.currentDay) {
        relativeDay = userProfile.currentDay;
        daySlider.value = relativeDay;
    }
    
    const selectedPeer = peerSelect.value;
    
    // Update Slider Header Display
    dayDisplay.textContent = `Day ${relativeDay}`;
    peerDayDisplays.forEach(el => el.textContent = `Day ${relativeDay}`);

    // 1. Fetch data nodes
    const userData = userTimeline[relativeDay];
    const peerData = profiles[selectedPeer].timeline[relativeDay] || profiles[selectedPeer].timeline[14]; // fallback to last mock day

    if (!userData || !peerData) return;

    // 2. Render User Card
    if (userNameLabel) userNameLabel.textContent = userProfile.name;
    userSolves.textContent = userData.solves;
    userComfortEmoji.textContent = userData.moodEmoji;
    userComfortText.textContent = userData.moodText;
    userTopic.textContent = userData.topic;
    userStruggle.textContent = userData.struggle;
    userBreakthrough.textContent = userData.breakthrough;

    // 3. Render Peer Card
    peerName.textContent = selectedPeer;
    peerSolves.textContent = peerData.solves;
    peerComfortEmoji.textContent = peerData.moodEmoji;
    peerComfortText.textContent = peerData.moodText;
    peerTopic.textContent = peerData.topic;
    peerStruggle.textContent = peerData.struggle;
    peerBreakthrough.textContent = peerData.breakthrough;

    // 4. Generate Dynamic Insight
    let insight = "";
    if (userData.solves > peerData.solves) {
        const diff = userData.solves - peerData.solves;
        insight = `On <strong>Day ${relativeDay}</strong>, you had solved <strong>${userData.solves}</strong> problems, which was <strong>${diff} more</strong> than ${selectedPeer} (who had solved ${peerData.solves}). While ${selectedPeer} is now far ahead, at this exact point in time, they were struggling with <em>"${peerData.struggle}"</em> and felt <strong>${peerData.moodText}</strong>. Growth is non-linear—keep pushing!`;
    } else if (userData.solves < peerData.solves) {
        const diff = peerData.solves - userData.solves;
        insight = `On <strong>Day ${relativeDay}</strong>, ${selectedPeer} had solved <strong>${peerData.solves}</strong> problems (${diff} more than you), but they were feeling <strong>${peerData.moodText}</strong> and struggling with <em>"${peerData.struggle}"</em>. Even with a slightly faster solve rate, they were experiencing identical confusion. Struggles are normalized!`;
    } else {
        insight = `On <strong>Day ${relativeDay}</strong>, both you and ${selectedPeer} had solved exactly <strong>${userData.solves}</strong> problems. While you were studying <em>"${userData.topic}"</em>, ${selectedPeer} was working on <em>"${peerData.topic}"</em> and feeling <strong>${peerData.moodText}</strong> due to <em>"${peerData.struggle}"</em>. You are moving at a textbook expert pace!`;
    }

    insightText.innerHTML = insight;
}

/* ================= EVENT BINDINGS ================= */
daySlider.addEventListener("input", renderComparison);
peerSelect.addEventListener("change", renderComparison);

/* ================= INITIALIZATION ================= */
renderComparison();
