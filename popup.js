/**
 * popup.js — Popup Controller
 * Manages UI state, communicates with the background service worker,
 * and drives the live countdown ring animation.
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
const actionBtn = document.getElementById("actionBtn");
const actionBtnIcon = document.getElementById("actionBtnIcon");
const actionBtnText = document.getElementById("actionBtnText");
const lastRefreshed = document.getElementById("lastRefreshed");

// Ring circumference (2π × r where r=34)
const RING_CIRCUMFERENCE = 213.63;

// ─────────────────────────────────────────────
//  Inject SVG gradient definition into the ring
// ─────────────────────────────────────────────
(function injectRingGradient() {
    const svg = document.querySelector(".ring-svg");
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
    <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4fa3e0"/>
      <stop offset="100%" stop-color="#7b61ff"/>
    </linearGradient>
  `;
    svg.prepend(defs);

    // Apply gradient stroke reference
    ringFill.setAttribute("stroke", "url(#ringGradient)");
})();

// ─────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────
let selectedSeconds = 30;   // currently selected interval in seconds
let selectedUnit = "seconds";
let selectedMode = "current";
let countdownTimer = null; // setInterval for live countdown

// ─────────────────────────────────────────────
//  Initialise popup from persisted storage
// ─────────────────────────────────────────────
chrome.runtime.sendMessage({ action: "getState" }, (state) => {
    if (chrome.runtime.lastError) return;

    if (state?.isRunning) {
        selectedSeconds = state.intervalSeconds ?? 30;
        selectedMode = state.mode ?? "current";
        syncModeButtons(selectedMode);
        setRunningUI(true, state.startedAt, state.intervalSeconds);
    }

    if (state?.lastRefreshedAt) {
        updateLastRefreshed(state.lastRefreshedAt);
    }
});

// ─────────────────────────────────────────────
//  Quick Select Buttons
// ─────────────────────────────────────────────
quickBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        const sec = parseInt(btn.dataset.seconds, 10);
        setSelectedInterval(sec);
        quickBtns.forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        customValueEl.value = "";
    });
});

// Default highlight first button
document.getElementById("btn30s").classList.add("selected");

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
    // Deselect quick buttons when typing
    quickBtns.forEach((b) => b.classList.remove("selected"));
    applyCustomInput();
});

function applyCustomInput() {
    const raw = parseFloat(customValueEl.value);
    if (!raw || isNaN(raw) || raw <= 0) return;
    const sec = selectedUnit === "minutes" ? raw * 60 : raw;
    setSelectedInterval(Math.round(sec));
}

// ─────────────────────────────────────────────
//  Mode Buttons
// ─────────────────────────────────────────────
modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        selectedMode = btn.dataset.mode;
        syncModeButtons(selectedMode);
    });
});

function syncModeButtons(mode) {
    modeBtns.forEach((b) => {
        b.classList.toggle("active", b.dataset.mode === mode);
    });
}

// ─────────────────────────────────────────────
//  Action Button
// ─────────────────────────────────────────────
actionBtn.addEventListener("click", () => {
    if (actionBtn.classList.contains("running")) {
        stopRefresh();
    } else {
        startRefresh();
    }
});

function startRefresh() {
    if (!selectedSeconds || selectedSeconds < 1) {
        customValueEl.focus();
        customValueEl.style.borderColor = "#f87171";
        setTimeout(() => { customValueEl.style.borderColor = ""; }, 1500);
        return;
    }

    chrome.runtime.sendMessage(
        { action: "start", intervalSeconds: selectedSeconds, mode: selectedMode },
        () => {
            if (chrome.runtime.lastError) return;
            setRunningUI(true, Date.now(), selectedSeconds);
        }
    );
}

function stopRefresh() {
    chrome.runtime.sendMessage({ action: "stop" }, () => {
        setRunningUI(false);
    });
}

// ─────────────────────────────────────────────
//  UI State Control
// ─────────────────────────────────────────────
function setRunningUI(running, startedAt, intervalSec) {
    if (running) {
        actionBtn.classList.add("running");
        actionBtnIcon.textContent = "■";
        actionBtnText.textContent = "Stop Refresh";
        statusDot.classList.add("active");
        countdownLabel.textContent = selectedMode === "all" ? "Refreshing all tabs" : "Refreshing current tab";
        startCountdown(startedAt, intervalSec ?? selectedSeconds);
    } else {
        actionBtn.classList.remove("running");
        actionBtnIcon.textContent = "▶";
        actionBtnText.textContent = "Start Refresh";
        statusDot.classList.remove("active");
        countdownLabel.textContent = "Not running";
        stopCountdown();
        countdownNumber.textContent = "--";
        countdownUnit.textContent = "sec";
        setRingProgress(0);
    }
}

// ─────────────────────────────────────────────
//  Countdown Ring
// ─────────────────────────────────────────────
function startCountdown(startedAt, intervalSec) {
    stopCountdown();

    function tick() {
        const elapsed = (Date.now() - startedAt) / 1000;
        const cyclePos = elapsed % intervalSec;
        const remaining = intervalSec - cyclePos;
        const progress = cyclePos / intervalSec;

        if (remaining >= 60) {
            countdownNumber.textContent = Math.ceil(remaining / 60);
            countdownUnit.textContent = "min";
        } else {
            countdownNumber.textContent = Math.ceil(remaining);
            countdownUnit.textContent = "sec";
        }

        setRingProgress(progress);
    }

    tick();
    countdownTimer = setInterval(tick, 500);
}

function stopCountdown() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
}

function setRingProgress(progress) {
    // progress: 0 = empty, 1 = full
    const offset = RING_CIRCUMFERENCE * (1 - progress);
    ringFill.style.strokeDashoffset = offset;
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function setSelectedInterval(sec) {
    selectedSeconds = sec;
}

function updateLastRefreshed(timestamp) {
    const diff = Math.round((Date.now() - timestamp) / 1000);
    if (diff < 5) lastRefreshed.textContent = "Last refreshed: just now";
    else if (diff < 60) lastRefreshed.textContent = `Last refreshed: ${diff}s ago`;
    else lastRefreshed.textContent = `Last refreshed: ${Math.round(diff / 60)}m ago`;
}

// Poll for lastRefreshedAt so footer updates in real-time while popup is open
setInterval(() => {
    chrome.storage.local.get(["lastRefreshedAt"], (data) => {
        if (data?.lastRefreshedAt) updateLastRefreshed(data.lastRefreshedAt);
    });
}, 2000);
