/**
 * background.js — Service Worker (v1.2.0)
 *
 * Cross-browser (Chrome + Firefox) compatible.
 *
 * Key change for Firefox: Firefox clamps chrome.alarms periodInMinutes to a
 * minimum of 1 minute, so 30s/60s presets would break. Instead we use
 * ONE-SHOT alarms that are re-scheduled after each fire — both browsers
 * allow sub-minute delayInMinutes for one-shot alarms.
 *
 * Features:
 *  - One-shot alarm pattern (sub-minute intervals on Chrome & Firefox)
 *  - Pause / Resume (preserves remaining time)
 *  - Skip active tab (All Tabs mode skips focused tab)
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
//  Schedule a one-shot alarm (cross-browser)
//  Firefox: supports sub-minute delayInMinutes for one-shot alarms
//  Chrome: no minimum delay for one-shot alarms
// ─────────────────────────────────────────────
function scheduleAlarm(delaySeconds) {
  chrome.alarms.clear(ALARM_NAME, () => {
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: delaySeconds / 60,
      // No periodInMinutes — we re-schedule manually after each fire
    });
  });
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
        ["isRunning", "isPaused", "intervalSeconds", "mode", "skipActive",
          "startedAt", "pausedRemaining", "lastRefreshedAt"],
        (data) => sendResponse(data)
      );
      return true; // async response
  }
});

// ─────────────────────────────────────────────
//  Start
// ─────────────────────────────────────────────
function startRefresh(intervalSeconds, mode, skipActive) {
  chrome.storage.local.set({
    isRunning: true,
    isPaused: false,
    intervalSeconds,
    mode,
    skipActive: skipActive ?? false,
    startedAt: Date.now(),
    pausedRemaining: null,
  }, () => {
    scheduleAlarm(intervalSeconds);
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
//  Resume — one-shot alarm from remaining time
// ─────────────────────────────────────────────
function resumeRefresh() {
  chrome.storage.local.get(["pausedRemaining", "intervalSeconds"], (data) => {
    const remaining = data.pausedRemaining ?? data.intervalSeconds ?? 30;
    const intervalSec = data.intervalSeconds ?? 30;
    const newStartedAt = Date.now() - (intervalSec - remaining) * 1000;

    chrome.storage.local.set({
      isPaused: false,
      pausedRemaining: null,
      startedAt: newStartedAt,
    }, () => {
      scheduleAlarm(remaining);
      setBadge("running");
    });
  });
}

// ─────────────────────────────────────────────
//  Alarm handler — refresh tabs, then re-schedule
// ─────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const data = await chrome.storage.local.get(
    ["isRunning", "isPaused", "mode", "skipActive", "intervalSeconds"]
  );
  if (!data.isRunning || data.isPaused) return;

  const [focusedTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (data.mode === "all") {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id) continue;
      if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")
        || tab.url.startsWith("about:") || tab.url.startsWith("moz-extension://")) continue;
      if (data.skipActive && focusedTab && tab.id === focusedTab.id) continue;
      chrome.tabs.reload(tab.id);
    }
  } else {
    if (!(data.skipActive && focusedTab?.active) && focusedTab?.id) {
      chrome.tabs.reload(focusedTab.id);
    }
  }

  const now = Date.now();
  // Reset startedAt and re-schedule the next one-shot alarm
  chrome.storage.local.set({ lastRefreshedAt: now, startedAt: now });
  scheduleAlarm(data.intervalSeconds ?? 30);
});

// ─────────────────────────────────────────────
//  On install — clear stale state
// ─────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.clear(ALARM_NAME);
  chrome.storage.local.set({ isRunning: false, isPaused: false });
  setBadge("stopped");
});
