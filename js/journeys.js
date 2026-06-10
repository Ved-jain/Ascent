/* ================= TIMELINE DATASETS ================= */
const communityData = {
    "Dynamic Programming": {
        steps: [
            { week: "W1", mood: "😞", label: "Frustrating", tooltip: "Confused by recursion overlaps" },
            { week: "W2", mood: "😞", label: "Frustrating", tooltip: "Struggling with state definitions" },
            { week: "W3", mood: "😓", label: "Difficult", tooltip: "Drafting transition equations" },
            { week: "W4", mood: "😐", label: "Neutral", tooltip: "Memoization cache clicked" },
            { week: "W5", mood: "🙂", label: "Comfortable", tooltip: "Solving standard easy/mediums" }
        ]
    },
    "Graphs": {
        steps: [
            { week: "W1", mood: "😞", label: "Frustrating", tooltip: "Struggling with node edge matrices" },
            { week: "W2", mood: "😓", label: "Difficult", tooltip: "DFS vs BFS traversal rules" },
            { week: "W3", mood: "😓", label: "Difficult", tooltip: "Detecting cycles in search loops" },
            { week: "W4", mood: "😐", label: "Neutral", tooltip: "BFS Queue structure clicked" },
            { week: "W5", mood: "🙂", label: "Comfortable", tooltip: "Solving traversal problems" }
        ]
    },
    "Binary Search": {
        steps: [
            { week: "W1", mood: "😞", label: "Frustrating", tooltip: "Confused by target search partition" },
            { week: "W2", mood: "😓", label: "Difficult", tooltip: "Infinite loops with pointers" },
            { week: "W3", mood: "😐", label: "Neutral", tooltip: "Left/right offset bounds clicked" },
            { week: "W4", mood: "🙂", label: "Comfortable", tooltip: "Standard searches solved" },
            { week: "W5", mood: "😊", label: "Strong", tooltip: "Confidently solving search spaces" }
        ]
    }
};

/* ================= STATE & LOAD ================= */
let activeJourneys = {};

function loadState() {
    const stored = localStorage.getItem("ascent_active_journeys");
    activeJourneys = stored ? JSON.parse(stored) : {};
}

function saveState() {
    localStorage.setItem("ascent_active_journeys", JSON.stringify(activeJourneys));
}

/* ================= RENDERING ================= */
function renderJourneys() {
    loadState();

    const topics = ["Dynamic Programming", "Graphs", "Binary Search"];
    const idMap = {
        "Dynamic Programming": { card: "card-dp", overlay: "overlay-dp", timeline: "timeline-dp" },
        "Graphs": { card: "card-graphs", overlay: "overlay-graphs", timeline: "timeline-graphs" },
        "Binary Search": { card: "card-binarysearch", overlay: "overlay-binarysearch", timeline: "timeline-binarysearch" }
    };

    topics.forEach(topic => {
        const ids = idMap[topic];
        const cardEl = document.getElementById(ids.card);
        const overlayEl = document.getElementById(ids.overlay);
        const timelineEl = document.getElementById(ids.timeline);

        const isUnlocked = activeJourneys[topic] === true;

        if (isUnlocked) {
            // Unlocked state
            if (cardEl) cardEl.classList.remove("locked");
            if (overlayEl) {
                overlayEl.style.opacity = "0";
                setTimeout(() => { overlayEl.style.display = "none"; }, 300);
            }
            
            // Build Horizontal Timeline
            if (timelineEl && timelineEl.children.length === 0) {
                const data = communityData[topic];
                data.steps.forEach(step => {
                    const stepDiv = document.createElement("div");
                    stepDiv.className = "timeline-step";
                    stepDiv.setAttribute("data-tooltip", step.tooltip);

                    stepDiv.innerHTML = `
                        <span class="step-week">${step.week}</span>
                        <span class="step-mood">${step.mood}</span>
                        <span class="step-label">${step.label}</span>
                    `;
                    timelineEl.appendChild(stepDiv);
                });
            }
        } else {
            // Locked state
            if (cardEl) cardEl.classList.add("locked");
            if (overlayEl) {
                overlayEl.style.display = "flex";
                overlayEl.style.opacity = "1";
            }
            if (timelineEl) timelineEl.innerHTML = ""; // Empty timeline if locked
        }
    });
}

/* ================= EVENT BINDINGS ================= */
document.querySelectorAll(".unlock-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const topic = e.target.getAttribute("data-topic");
        activeJourneys[topic] = true;
        saveState();
        renderJourneys();
    });
});

// Initialize on load with error catch
try {
    renderJourneys();
} catch (error) {
    console.error("Error rendering journeys:", error);
}
