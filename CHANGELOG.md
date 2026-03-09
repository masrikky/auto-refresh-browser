# Changelog

All notable changes to **Auto Refresh Browser** are documented here.

This project adheres to [Semantic Versioning](https://semver.org/) and
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/) conventions.

---

## [1.1.0] — 2026-03-09

### Added
- **Pause / Resume** — freeze the countdown without losing your place; the remaining time is stored and the alarm resumes from exactly where it left off
- **Badge indicator** — the extension toolbar icon shows `ON` (green) when running, `||` (amber) when paused, and is empty when stopped
- **Skip active tab** — pill toggle in the popup; when enabled, the currently focused tab is excluded from refresh (useful in All Tabs mode so your reading is never interrupted)
- Amber pulsing status dot in popup header for the paused state

---

## [1.0.1] — 2026-03-09

### Changed
- Added **author footer** to the popup with name "masrikky" and three icon links:
  - 🌐 Personal website — [rikky.my.id](https://rikky.my.id)
  - 🐙 GitHub — [github.com/masrikky](https://github.com/masrikky)
  - 🔵 Google Developer — [g.dev/masrikky](https://g.dev/masrikky)
- Icon buttons styled with per-platform hover accent colours

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
