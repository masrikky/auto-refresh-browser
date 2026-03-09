/**
 * popup.js — Popup Controller (v1.1.0)
 * Handles badge, pause/resume, skip-active-tab, and live countdown ring.
 */

// ─────────────────────────────────────────────
//  DOM References
// ─────────────────────────────────────────────
const statusDot = document.getElementById("statusDot");
const quickBtns = document.querySelectorAll(".quick-btn");
const customValueEl = document.getElementById("customValue");
const unitBtns = document.querySelectorAll(".unit-btn");
const modeBtns = document.querySelectorAll(".mode-btn");
const countdownNumber = document.getElementById("countdownNumber");
const countdownUnit = document.getElementById("countdownUnit");
const countdownLabel = document.getElementById("countdownLabel");
const ringFill = document.getElementById("ringFill");
const lastRefreshed = document.getElementById("lastRefreshed");

// Action buttons
const btnStart = document.getElementById("btnStart");
const btnPause = document.getElementById("btnPause");
const btnStop = document.getElementById("btnStop");
const btnResume = document.getElementById("btnResume");

// Skip active tab toggle
const skipActiveToggle = document.getElementById("skipActiveToggle");

// Ring circumference (2π × 34)
const RING_CIRCUMFERENCE = 213.63;

// ─────────────────────────────────────────────
//  SVG gradient
// ─────────────────────────────────────────────
(function injectRingGradient() {
    const svg = document.querySelector(".ring-svg");
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
    <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4fa3e0"/>
      <stop offset="100%" stop-color="#7b61ff"/>
    </linearGradient>`;
    svg.prepend(defs);
    ringFill.setAttribute("stroke", "url(#ringGradient)");
})();

// ─────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────
let selectedSeconds = 30;
let selectedUnit = "seconds";
let selectedMode = "current";
let skipActive = false;
let countdownTimer = null;

// ─────────────────────────────────────────────
//  Init from persisted state
// ─────────────────────────────────────────────
chrome.runtime.sendMessage({ action: "getState" }, (state) => {
    if (chrome.runtime.lastError || !state) return;

    // Restore interval selection
    if (state.intervalSeconds) {
        selectedSeconds = state.intervalSeconds;
        highlightQuickBtn(selectedSeconds);
    }

    // Restore mode
    if (state.mode) {
        selectedMode = state.mode;
        syncModeButtons(selectedMode);
    }

    // Restore skip-active toggle
    skipActive = state.skipActive ?? false;
    updateSkipToggleUI(skipActive);

    // Restore running/paused UI
    if (state.isRunning && state.isPaused) {
        setUIState("paused", state.pausedRemaining, state.intervalSeconds);
    } else if (state.isRunning) {
        setUIState("running", state.startedAt, state.intervalSeconds);
    }

    if (state.lastRefreshedAt) updateLastRefreshed(state.lastRefreshedAt);
});

// ─────────────────────────────────────────────
//  Quick Select
// ─────────────────────────────────────────────
quickBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        selectedSeconds = parseInt(btn.dataset.seconds, 10);
        quickBtns.forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        customValueEl.value = "";
    });
});

// Default highlight
document.getElementById("btn30s").classList.add("selected");

function highlightQuickBtn(sec) {
    quickBtns.forEach((b) => {
        b.classList.toggle("selected", parseInt(b.dataset.seconds, 10) === sec);
    });
}

// ─────────────────────────────────────────────
//  Unit Toggle
// ─────────────────────────────────────────────
unitBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        selectedUnit = btn.dataset.unit;
        unitBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        applyCustomInput();
    });
});

// ─────────────────────────────────────────────
//  Custom Input
// ─────────────────────────────────────────────
customValueEl.addEventListener("input", () => {
    quickBtns.forEach((b) => b.classList.remove("selected"));
    applyCustomInput();
});

function applyCustomInput() {
    const raw = parseFloat(customValueEl.value);
    if (!raw || isNaN(raw) || raw <= 0) return;
    selectedSeconds = Math.round(selectedUnit === "minutes" ? raw * 60 : raw);
}

// ─────────────────────────────────────────────
//  Mode Toggle
// ─────────────────────────────────────────────
modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        selectedMode = btn.dataset.mode;
        syncModeButtons(selectedMode);
    });
});

function syncModeButtons(mode) {
    modeBtns.forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
}

// ─────────────────────────────────────────────
//  Skip Active Tab Toggle
// ─────────────────────────────────────────────
skipActiveToggle.addEventListener("click", () => {
    skipActive = !skipActive;
    updateSkipToggleUI(skipActive);
    chrome.runtime.sendMessage({ action: "setSkipActive", value: skipActive });
});

function updateSkipToggleUI(active) {
    skipActiveToggle.setAttribute("aria-checked", String(active));
    skipActiveToggle.classList.toggle("on", active);
}

// ─────────────────────────────────────────────
//  Action Buttons
// ─────────────────────────────────────────────
btnStart.addEventListener("click", () => {
    if (!selectedSeconds || selectedSeconds < 1) {
        customValueEl.focus();
        customValueEl.style.borderColor = "#f87171";
        setTimeout(() => { customValueEl.style.borderColor = ""; }, 1500);
        return;
    }
    chrome.runtime.sendMessage(
        { action: "start", intervalSeconds: selectedSeconds, mode: selectedMode, skipActive },
        () => setUIState("running", Date.now(), selectedSeconds)
    );
});

btnPause.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "pause" }, () => {
        // Snapshot remaining time from the current countdown for display
        const elapsed = (Date.now() - currentStartedAt) / 1000;
        const cyclePos = elapsed % currentInterval;
        const remaining = currentInterval - cyclePos;
        setUIState("paused", remaining, currentInterval);
    });
});

btnResume.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "resume" }, () => {
        // background adjusts startedAt; recalculate for popup
        chrome.storage.local.get(["startedAt", "intervalSeconds"], (data) => {
            setUIState("running", data.startedAt, data.intervalSeconds);
        });
    });
});

btnStop.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "stop" }, () => setUIState("stopped"));
});

// Track current countdown params for pause snapshot
let currentStartedAt = null;
let currentInterval = null;

// ─────────────────────────────────────────────
//  UI State Machine
// ─────────────────────────────────────────────
/**
 * @param {"stopped"|"running"|"paused"} state
 * @param {number|null} param  startedAt (running) | pausedRemaining seconds (paused)
 * @param {number|null} intervalSec
 */
function setUIState(state, param, intervalSec) {
    // Reset buttons
    btnStart.classList.add("hidden");
    btnPause.classList.add("hidden");
    btnStop.classList.add("hidden");
    btnResume.classList.add("hidden");

    stopCountdown();

    if (state === "running") {
        btnPause.classList.remove("hidden");
        btnStop.classList.remove("hidden");
        statusDot.className = "status-dot active";
        countdownLabel.textContent = selectedMode === "all" ? "Refreshing all tabs" : "Refreshing current tab";

        currentStartedAt = param;   // param = startedAt timestamp
        currentInterval = intervalSec;
        startCountdown(param, intervalSec);

    } else if (state === "paused") {
        btnResume.classList.remove("hidden");
        btnStop.classList.remove("hidden");
        statusDot.className = "status-dot paused";
        countdownLabel.textContent = "Paused";

        // Show frozen remaining time
        const remaining = param; // param = remaining seconds
        displayCountdown(remaining, intervalSec);
        setRingProgress(remaining / intervalSec);

    } else {
        // stopped
        btnStart.classList.remove("hidden");
        statusDot.className = "status-dot";
        countdownLabel.textContent = "Not running";
        countdownNumber.textContent = "--";
        countdownUnit.textContent = "sec";
        setRingProgress(0);
    }
}

// ─────────────────────────────────────────────
//  Countdown Ring
// ─────────────────────────────────────────────
function startCountdown(startedAt, intervalSec) {
    function tick() {
        const elapsed = (Date.now() - startedAt) / 1000;
        const cyclePos = elapsed % intervalSec;
        const remaining = intervalSec - cyclePos;
        displayCountdown(remaining, intervalSec);
        setRingProgress(cyclePos / intervalSec);
    }
    tick();
    countdownTimer = setInterval(tick, 500);
}

function stopCountdown() {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
}

function displayCountdown(remaining, intervalSec) {
    if (remaining >= 60) {
        countdownNumber.textContent = Math.ceil(remaining / 60);
        countdownUnit.textContent = "min";
    } else {
        countdownNumber.textContent = Math.ceil(remaining);
        countdownUnit.textContent = "sec";
    }
}

function setRingProgress(progress) {
    ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - Math.min(Math.max(progress, 0), 1));
}

// ─────────────────────────────────────────────
//  Footer — last refreshed
// ─────────────────────────────────────────────
function updateLastRefreshed(ts) {
    const diff = Math.round((Date.now() - ts) / 1000);
    if (diff < 5) lastRefreshed.textContent = "Last refreshed: just now";
    else if (diff < 60) lastRefreshed.textContent = `Last refreshed: ${diff}s ago`;
    else lastRefreshed.textContent = `Last refreshed: ${Math.round(diff / 60)}m ago`;
}

setInterval(() => {
    chrome.storage.local.get(["lastRefreshedAt"], (d) => {
        if (d?.lastRefreshedAt) updateLastRefreshed(d.lastRefreshedAt);
    });
}, 2000);
