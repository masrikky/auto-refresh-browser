# Auto Refresh Browser

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)

> **Keep your browser sessions alive.** Auto Refresh Browser is a Chrome extension that automatically reloads tabs at configurable intervals — preventing idle timeouts and session logouts on any website.

---

## Features

- ⚡ **Quick presets** — 30s, 1m, 5m, 10m with a single click
- 🕐 **Custom interval** — Enter any value in seconds or minutes
- 🗂️ **Two refresh modes**
  - **Current Tab** — Refreshes only the tab you're viewing
  - **All Tabs** — Refreshes every open tab across all windows (skips `chrome://` pages)
- 🔄 **Persistent state** — Runs in the background via `chrome.alarms`; survives popup close and browser restart
- 📊 **Live countdown ring** — Animated circular progress showing time until next refresh
- 🟢 **Status indicator** — Pulsing dot shows at a glance whether refresh is active

---

## Installation (Developer Mode)

> The extension is not yet published to the Chrome Web Store. Follow these steps to load it manually:

1. Download or clone this repository:
   ```bash
   git clone https://github.com/masrikky/auto-refresh-browser.git
   ```

2. Open Chrome and navigate to:
   ```
   chrome://extensions/
   ```

3. Enable **Developer mode** (toggle in the top-right corner).

4. Click **Load unpacked** and select the `auto-refresh-browser` folder.

5. The 🔄 icon will appear in your Chrome toolbar. Pin it for easy access.

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

- **`background.js`** — Manifest V3 service worker. Creates a `chrome.alarm` with the configured period. On each alarm, reloads the target tab(s). State is persisted to `chrome.storage.local` so the countdown resumes correctly if the popup is reopened.
- **`popup.js`** — Reads state from storage on open, renders the live countdown ring by computing elapsed time against `startedAt`, and passes start/stop commands to the background worker.

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
