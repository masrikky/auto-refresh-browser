/**
 * background.js — Service Worker
 * Handles the refresh alarm lifecycle independently of the popup window.
 * Uses chrome.alarms for reliable periodic execution even when popup is closed.
 */

const ALARM_NAME = "auto-refresh-alarm";

// ─────────────────────────────────────────────
//  Message listener (from popup.js)
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "start") {
    startRefresh(message.intervalSeconds, message.mode);
    sendResponse({ ok: true });
  } else if (message.action === "stop") {
    stopRefresh();
    sendResponse({ ok: true });
  } else if (message.action === "getState") {
    chrome.storage.local.get(["isRunning", "intervalSeconds", "mode", "startedAt"], (data) => {
      sendResponse(data);
    });
    return true; // async response
  }
});

// ─────────────────────────────────────────────
//  Start refresh
// ─────────────────────────────────────────────
function startRefresh(intervalSeconds, mode) {
  const periodInMinutes = intervalSeconds / 60;

  // Clear any existing alarm first
  chrome.alarms.clear(ALARM_NAME, () => {
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: periodInMinutes,
      periodInMinutes: periodInMinutes,
    });

    const startedAt = Date.now();
    chrome.storage.local.set({
      isRunning: true,
      intervalSeconds,
      mode,
      startedAt,
    });
  });
}

// ─────────────────────────────────────────────
//  Stop refresh
// ─────────────────────────────────────────────
function stopRefresh() {
  chrome.alarms.clear(ALARM_NAME);
  chrome.storage.local.set({ isRunning: false });
}

// ─────────────────────────────────────────────
//  Alarm handler — performs the actual refresh
// ─────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const data = await chrome.storage.local.get(["isRunning", "mode"]);
  if (!data.isRunning) return;

  if (data.mode === "all") {
    // Refresh all open tabs across all windows
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && !tab.url?.startsWith("chrome://") && !tab.url?.startsWith("chrome-extension://")) {
        chrome.tabs.reload(tab.id);
      }
    }
  } else {
    // Refresh only the currently active tab in the focused window
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id) {
      chrome.tabs.reload(activeTab.id);
    }
  }

  // Update the last-refreshed timestamp for the popup to display
  chrome.storage.local.set({ lastRefreshedAt: Date.now() });
});

// ─────────────────────────────────────────────
//  On install / update — clear stale state
// ─────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.clear(ALARM_NAME);
  chrome.storage.local.set({ isRunning: false });
});
