# Changelog

All notable changes to **Auto Refresh Browser** are documented here.

This project adheres to [Semantic Versioning](https://semver.org/) and
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/) conventions.

---

## [1.0.0] — 2026-03-09

### 🎉 Initial Release

#### Added
- **Chrome Extension** built with Manifest V3
- **Quick-select presets**: 30s, 1m, 5m, 10m
- **Custom interval input** with seconds / minutes unit toggle
- **Two refresh modes**:
  - *Current Tab* — refreshes only the active tab in the focused window
  - *All Tabs* — refreshes all open tabs across all windows (skips `chrome://` and extension pages)
- **Background service worker** (`background.js`) using `chrome.alarms` API for reliable, persistent refresh that survives popup close
- **Live countdown ring** — animated SVG progress ring in the popup driven by the `startedAt` timestamp stored in `chrome.storage.local`
- **Persistent state** — refresh continues running even when popup is closed; state is restored on next popup open
- **Status indicator** — pulsing green dot in popup header when refresh is active
- **Last refreshed footer** — shows relative time of the last successful refresh
- **Dark glassmorphism UI** — Inter font, gradient accent colors, smooth hover transitions
- `README.md` — Installation guide, usage instructions, architecture overview
- `CHANGELOG.md` — This file

#### Permissions Used
- `alarms` — periodic alarm execution
- `tabs` — read and reload tabs
- `storage` — persist timer state

---

<!-- Keep newest entries at the top -->
