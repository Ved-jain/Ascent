/* ================= STATE & STORAGE ================= */
let problemStatus = {};

function loadStatus() {
    const stored = localStorage.getItem("ascent_problems_status");
    problemStatus = stored ? JSON.parse(stored) : {};
}

function saveStatus() {
    localStorage.setItem("ascent_problems_status", JSON.stringify(problemStatus));
}

/* ================= RENDERING ================= */
function renderProblems() {
    loadStatus();

    document.querySelectorAll(".problem-row").forEach(row => {
        const id = row.getAttribute("data-id");
        const solvedBtn = row.querySelector(".action-btn.solved");
        const strugglingBtn = row.querySelector(".action-btn.struggling");

        // Reset classes
        row.classList.remove("is-solved", "is-struggling");
        if (solvedBtn) solvedBtn.classList.remove("active");
        if (strugglingBtn) strugglingBtn.classList.remove("active");

        const status = problemStatus[id];

        if (status === "solved") {
            row.classList.add("is-solved");
            if (solvedBtn) solvedBtn.classList.add("active");
        } else if (status === "struggling") {
            row.classList.add("is-struggling");
            if (strugglingBtn) strugglingBtn.classList.add("active");
        }
    });
}

/* ================= ACTION BINDINGS ================= */
document.querySelectorAll(".action-btn.solved").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        
        // Toggle solved status
        if (problemStatus[id] === "solved") {
            delete problemStatus[id];
        } else {
            problemStatus[id] = "solved";
        }

        saveStatus();
        renderProblems();
    });
});

document.querySelectorAll(".action-btn.struggling").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        const topic = e.target.getAttribute("data-topic");
        const name = e.target.getAttribute("data-name");

        let togglingOff = problemStatus[id] === "struggling";

        if (togglingOff) {
            delete problemStatus[id];
            saveStatus();
            renderProblems();
        } else {
            problemStatus[id] = "struggling";
            saveStatus();
            renderProblems();

            // Ask user if they want to log this struggle in their check-in
            setTimeout(() => {
                const wantToCheckin = confirm(`You marked "${name}" as a struggle. Would you like to log a daily reflection to capture what is blocking you?`);
                if (wantToCheckin) {
                    // Set context for check-in page
                    const context = {
                        topic: topic,
                        problem: name
                    };
                    localStorage.setItem("ascent_focus_context", JSON.stringify(context));
                    window.location.href = "checkin.html";
                }
            }, 100);
        }
    });
});

/* ================= INITIALIZATION ================= */
try {
    renderProblems();
} catch (error) {
    console.error("Error rendering problem sets:", error);
}
