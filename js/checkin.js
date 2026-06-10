/* ================= STATE ================= */
const checkinData = {
    mood: null,
    obstacles: [],
    comparison: null,
    notes: ""
};

/* ================= DOM ELEMENTS ================= */
const moodElements = document.querySelectorAll('.mood');
const obstacleElements = document.querySelectorAll('#obstacle-selector button');
const comparisonElements = document.querySelectorAll('#comparison-selector button');
const saveBtn = document.getElementById('save-checkin-btn');
const journalEntry = document.getElementById('journal-entry');

/* ================= EVENT LISTENERS ================= */

// 1. Mood Selection (Single Choice)
moodElements.forEach(mood => {
    mood.addEventListener('click', () => {
        moodElements.forEach(m => m.style.borderColor = '#ddd'); // Reset others
        mood.style.borderColor = '#2563eb'; // Highlight selected
        checkinData.mood = mood.getAttribute('data-value');
    });
});

// 2. Obstacles Selection (Multiple Choice)
obstacleElements.forEach(btn => {
    btn.addEventListener('click', () => {
        const value = btn.getAttribute('data-value');
        if (checkinData.obstacles.includes(value)) {
            // Deselect
            checkinData.obstacles = checkinData.obstacles.filter(o => o !== value);
            btn.style.borderColor = '#ddd';
            btn.style.background = 'white';
        } else {
            // Select
            checkinData.obstacles.push(value);
            btn.style.borderColor = '#2563eb';
            btn.style.background = '#eff6ff';
        }
    });
});

// 3. Comparison Awareness (Single Choice)
comparisonElements.forEach(btn => {
    btn.addEventListener('click', () => {
        comparisonElements.forEach(b => { b.style.borderColor = '#ddd'; b.style.background = 'white'; }); // Reset
        btn.style.borderColor = '#2563eb';
        btn.style.background = '#eff6ff';
        checkinData.comparison = btn.getAttribute('data-value');
    });
});

// 4. Save Reflection
saveBtn.addEventListener('click', () => {
    // Validate mood input
    if (!checkinData.mood) {
        alert("Please select how today's learning felt (choose a mood emoji) before saving.");
        return;
    }

    // Retrieve onboarding profile to compute relative day
    const profileDataStr = localStorage.getItem("ascent_profile");
    if (!profileDataStr) {
        alert("No onboarding profile found. Please complete onboarding first.");
        window.location.href = "onboarding.html";
        return;
    }

    const profile = JSON.parse(profileDataStr);
    const start = new Date(profile.startDate);
    const now = new Date();
    
    // Compute relative day (Day 1, Day 2, etc.)
    const diffTime = Math.abs(now - start);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    checkinData.notes = journalEntry.value.trim();

    const newEntry = {
        relativeDay: diffDays,
        date: now.toISOString().split('T')[0], // YYYY-MM-DD
        mood: checkinData.mood,
        obstacles: [...checkinData.obstacles],
        comparison: checkinData.comparison || "No",
        notes: checkinData.notes
    };

    // Store in localStorage list, replacing if already checked in today
    let checkins = JSON.parse(localStorage.getItem("ascent_checkins")) || [];
    checkins = checkins.filter(entry => entry.date !== newEntry.date);
    checkins.push(newEntry);
    localStorage.setItem("ascent_checkins", JSON.stringify(checkins));

    // Clear focus context since reflection is now saved
    localStorage.removeItem("ascent_focus_context");

    alert("Reflection saved successfully!");
    window.location.href = "home.html";
});

// Check for pre-filled context on load
function initCheckinContext() {
    const contextStr = localStorage.getItem("ascent_focus_context");
    if (contextStr) {
        try {
            const context = JSON.parse(contextStr);
            if (journalEntry) {
                journalEntry.value = `Struggling with ${context.problem} (${context.topic}) because: `;
                journalEntry.focus();
            }
            // Pre-select "Concepts" as default obstacle
            const conceptBtn = document.querySelector('#obstacle-selector button[data-value="Concepts"]');
            if (conceptBtn) {
                // Simulate click to trigger state update
                conceptBtn.click();
            }
        } catch (e) {
            console.error("Error parsing checkin context:", e);
        }
    }
}
initCheckinContext();