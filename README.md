# Auto Refresh Browser

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-102+-green.svg)](https://developer.chrome.com/docs/extensions/)
[![Firefox](https://img.shields.io/badge/Firefox-109+-orange.svg)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)

> **Keep your browser sessions alive.** Auto Refresh Browser is a cross-browser extension (Chrome & Firefox) that automatically reloads tabs at configurable intervals — preventing idle timeouts and session logouts on any website.

---

## Features

- ⚡ **Quick presets** — 30s, 1m, 5m, 10m with a single click
- 🕐 **Custom interval** — Enter any value in seconds or minutes
- 🗂️ **Two refresh modes**
  - **Current Tab** — Refreshes only the tab you're viewing
  - **All Tabs** — Refreshes every open tab across all windows (skips browser-internal pages)
- ⏸ **Pause / Resume** — Freeze the countdown without losing your place
- 🔄 **Persistent state** — Runs in the background via `chrome.alarms`; survives popup close
- 📊 **Live countdown ring** — Animated circular progress showing time until next refresh
- 🟢 **Status indicator** — Pulsing dot + toolbar badge (`ON` / `||`) at a glance
- 👁 **Skip active tab** — Don't refresh the tab you're currently reading
- 🦊 **Cross-browser** — Works on Chrome 102+ and Firefox 109+

---

## Installation (Developer Mode)

> The extension is not yet published to the Chrome Web Store or Firefox Add-ons. Follow the steps below to load it manually.

First, clone the repository:
```bash
git clone https://github.com/masrikky/auto-refresh-browser.git
```

### 🟢 Chrome / Edge / Brave

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked** → select the `auto-refresh-browser` folder
4. The 🔄 icon will appear in your toolbar — pin it for easy access

### 🦊 Firefox

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select the `manifest.json` file inside the `auto-refresh-browser` folder
4. The 🔄 icon appears in your toolbar

> **Note:** Firefox temporary add-ons are removed on browser restart. For a permanent install, the extension must be signed via [AMO](https://addons.mozilla.org/) or Firefox must be set to allow unsigned extensions (`xpinstall.signatures.required = false` in `about:config` — developer builds only).

---

## Usage

### Starting a Refresh

1. Click the extension icon to open the popup.
2. Choose a **quick preset** (30s / 1m / 5m / 10m) **or** enter a **custom interval**.
3. Select **Current Tab** or **All Tabs** mode.
4. Click **▶ Start Refresh**.

The countdown ring starts animating and your tab(s) will refresh on each cycle.

### Stopping a Refresh

Click **■ Stop Refresh** in the popup at any time.

### Custom Interval Examples

| Input | Unit | Effective Interval |
|-------|------|--------------------|
| `45`  | sec  | Every 45 seconds   |
| `2`   | min  | Every 2 minutes    |
| `90`  | sec  | Every 90 seconds   |
| `0.5` | min  | Every 30 seconds   |

---

## How It Works

```
popup.js  ──► chrome.runtime.sendMessage ──► background.js
                                               │
                                               ▼
                                       chrome.alarms.create()
                                               │
                                    [on alarm fire every N min]
                                               │
                                       chrome.tabs.reload()
                                               │
                                       chrome.storage.local
                                               │
popup.js  ◄── chrome.storage.local ◄──────────┘
(live countdown synced via startedAt timestamp)
```

- **`background.js`** — Manifest V3 service worker. Uses **one-shot alarms** (re-scheduled after each fire) instead of periodic alarms — this ensures sub-minute intervals (30s, 60s) work reliably on both Chrome and Firefox. Firefox clamps `periodInMinutes` to ≥ 1 min, but allows fractional `delayInMinutes` for one-shot alarms.
- **`popup.js`** — Reads state from storage on open, renders the live countdown ring by computing elapsed time against `startedAt`, and passes start/stop/pause/resume commands to the background worker.

---

## Permissions

| Permission | Reason |
|------------|--------|
| `alarms`   | Reliable periodic execution independent of popup lifecycle |
| `tabs`     | Read active tab and reload tabs |
| `storage`  | Persist timer state across popup open/close |

No data is ever sent to external servers. Everything runs locally.

---

## Project Structure

```
auto-refresh-browser/
├── manifest.json      # Extension manifest (Manifest V3)
├── background.js      # Service worker — alarm & refresh logic
├── popup.html         # Extension popup markup
├── popup.css          # Dark glassmorphism styles
├── popup.js           # Popup UI controller & countdown
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── README.md
└── CHANGELOG.md
```

---

## Contributing

Contributions, bug reports, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push and open a Pull Request

Please keep all code and documentation in **English**.

---

## License

[MIT](LICENSE) — feel free to use, modify, and distribute.
