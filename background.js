/**
 * background.js — Service Worker (v1.1.0)
 *
 * Features:
 *  - Alarm-based auto-refresh (survives popup close)
 *  - Pause / Resume (preserves remaining time)
 *  - Skip active tab (All Tabs mode skips the currently focused tab)
 *  - Badge indicator: "ON" (running), "||" (paused), "" (stopped)
 */

const ALARM_NAME = "auto-refresh-alarm";

// ─────────────────────────────────────────────
//  Badge helpers
// ─────────────────────────────────────────────
function setBadge(state) {
  switch (state) {
    case "running":
      chrome.action.setBadgeText({ text: "ON" });
      chrome.action.setBadgeBackgroundColor({ color: "#34d399" });
      break;
    case "paused":
      chrome.action.setBadgeText({ text: "||" });
      chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" });
      break;
    default:
      chrome.action.setBadgeText({ text: "" });
  }
}

// ─────────────────────────────────────────────
//  Message listener (from popup.js)
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.action) {
    case "start":
      startRefresh(message.intervalSeconds, message.mode, message.skipActive);
      sendResponse({ ok: true });
      break;

    case "stop":
      stopRefresh();
      sendResponse({ ok: true });
      break;

    case "pause":
      pauseRefresh();
      sendResponse({ ok: true });
      break;

    case "resume":
      resumeRefresh();
      sendResponse({ ok: true });
      break;

    case "setSkipActive":
      chrome.storage.local.set({ skipActive: message.value });
      sendResponse({ ok: true });
      break;

    case "getState":
      chrome.storage.local.get(
        ["isRunning", "isPaused", "intervalSeconds", "mode", "skipActive", "startedAt", "pausedRemaining", "lastRefreshedAt"],
        (data) => sendResponse(data)
      );
      return true; // async
  }
});

// ─────────────────────────────────────────────
//  Start
// ─────────────────────────────────────────────
function startRefresh(intervalSeconds, mode, skipActive) {
  const periodInMinutes = intervalSeconds / 60;

  chrome.alarms.clear(ALARM_NAME, () => {
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: periodInMinutes,
      periodInMinutes: periodInMinutes,
    });

    chrome.storage.local.set({
      isRunning: true,
      isPaused: false,
      intervalSeconds,
      mode,
      skipActive: skipActive ?? false,
      startedAt: Date.now(),
      pausedRemaining: null,
    });

    setBadge("running");
  });
}

// ─────────────────────────────────────────────
//  Stop
// ─────────────────────────────────────────────
function stopRefresh() {
  chrome.alarms.clear(ALARM_NAME);
  chrome.storage.local.set({ isRunning: false, isPaused: false, pausedRemaining: null });
  setBadge("stopped");
}

// ─────────────────────────────────────────────
//  Pause — snapshot remaining time, clear alarm
// ─────────────────────────────────────────────
function pauseRefresh() {
  chrome.storage.local.get(["startedAt", "intervalSeconds"], (data) => {
    const elapsed = (Date.now() - (data.startedAt ?? Date.now())) / 1000;
    const cyclePos = elapsed % (data.intervalSeconds ?? 30);
    const remaining = (data.intervalSeconds ?? 30) - cyclePos;

    chrome.alarms.clear(ALARM_NAME);
    chrome.storage.local.set({ isPaused: true, pausedRemaining: remaining });
    setBadge("paused");
  });
}

// ─────────────────────────────────────────────
//  Resume — restore alarm from remaining time
// ─────────────────────────────────────────────
function resumeRefresh() {
  chrome.storage.local.get(["pausedRemaining", "intervalSeconds"], (data) => {
    const remaining = data.pausedRemaining ?? data.intervalSeconds ?? 30;
    const intervalSeconds = data.intervalSeconds ?? 30;
    const periodInMinutes = intervalSeconds / 60;

    // Adjust startedAt so the popup countdown interpolation stays accurate
    const newStartedAt = Date.now() - (intervalSeconds - remaining) * 1000;

    chrome.alarms.clear(ALARM_NAME, () => {
      chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: remaining / 60,
        periodInMinutes: periodInMinutes,
      });

      chrome.storage.local.set({
        isPaused: false,
        pausedRemaining: null,
        startedAt: newStartedAt,
      });

      setBadge("running");
    });
  });
}

// ─────────────────────────────────────────────
//  Alarm handler — performs the actual refresh
// ─────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const data = await chrome.storage.local.get(["isRunning", "isPaused", "mode", "skipActive"]);
  if (!data.isRunning || data.isPaused) return;

  // Get the currently focused active tab so we can optionally skip it
  const [focusedTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (data.mode === "all") {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id) continue;
      if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) continue;
      // Skip active tab if the option is enabled
      if (data.skipActive && focusedTab && tab.id === focusedTab.id) continue;
      chrome.tabs.reload(tab.id);
    }
  } else {
    // Current tab mode — skip if skipActive is on and tab is active
    if (data.skipActive && focusedTab?.active) {
      // Reschedule for next cycle but don't reload
    } else if (focusedTab?.id) {
      chrome.tabs.reload(focusedTab.id);
    }
  }

  // Reset startedAt so countdown stays aligned after each real refresh
  chrome.storage.local.set({ lastRefreshedAt: Date.now(), startedAt: Date.now() });
});

// ─────────────────────────────────────────────
//  On install — clear stale state
// ─────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.clear(ALARM_NAME);
  chrome.storage.local.set({ isRunning: false, isPaused: false });
  setBadge("stopped");
});
