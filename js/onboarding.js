/* ================= DOM ELEMENTS ================= */
const onboardingForm = document.getElementById('onboarding-form');
const leetcodeInput = document.getElementById('leetcode-handle');
const codeforcesInput = document.getElementById('codeforces-handle');
const submitBtn = document.querySelector('.continue-btn');

/* ================= EVENT LISTENERS ================= */
onboardingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const userData = {
        leetcode: leetcodeInput.value.trim(),
        codeforces: codeforcesInput.value.trim()
    };

    if (!userData.leetcode) {
        alert("Please enter at least your LeetCode username.");
        return;
    }

    // Store user credentials and start date in localStorage
    const profile = {
        leetcode: userData.leetcode,
        codeforces: userData.codeforces,
        startDate: new Date().toISOString()
    };
    localStorage.setItem("ascent_profile", JSON.stringify(profile));
    
    // Clear any previous checkins to start fresh
    localStorage.removeItem("ascent_checkins");

    // Visual feedback for the user
    submitBtn.textContent = "Connecting...";
    submitBtn.style.opacity = "0.8";

    setTimeout(() => {
        window.location.href = "home.html";
    }, 1200);
});