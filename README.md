# Ins-अn-follow

A lightweight, local-first Chrome Extension built on Manifest V3 that allows you to scan your followers and following lists, identify exactly who has unfollowed you, and detect who does not follow you back.

## 📸 Screenshots

### Extension Popup
![Extension Popup](assets/Screenshot%202026-06-09%20212912.png)

### Follower Audit Dashboard
![Follower Audit Dashboard](assets/Screenshot%202026-06-09%20212931.png)

---

## Features

- **Unfollowers Tracker**: Compares your current followers list with your previous local scan snapshot to identify exactly **who has unfollowed you**.
- **Not Following Back list**: Displays all users you follow who do not follow you back.
- **Privacy First & 100% Local**: No passwords requested. It uses your active logged-in browser session cookies. No follower data or credentials ever leave your browser—all calculation and caching are stored inside your browser's local `chrome.storage.local` area.
- **High Performance (Parallel Scans)**: Scrapes followers and following lists concurrently in parallel to cut processing time in half.
- **Low Memory Footprint**: Implements paginated rendering (loading 100 items at a time) to prevent DOM lag and memory spikes.
- **Safe Scraping Rate Limits**: Employs a customizable delay (default 1.0 second) between queries to naturally match human actions and avoid triggering Instagram's rate limiters (429 errors).

---

## Tech Stack

- **Browser Spec**: Manifest V3 (Chrome Extension standard)
- **Front-end**: Vanilla HTML, CSS, JavaScript (No heavy frameworks or libraries)
- **Chrome APIs**: 
  - `chrome.cookies`: For session verification.
  - `chrome.storage.local`: For local snapshot caching.
  - `chrome.declarativeNetRequest`: Dynamic network rules to bypass Instagram CDN image blocks (adjusting `Referer` headers for DPs).

---

## Installation

Follow these steps to run the extension locally:

1. **Clone or Download** this repository to your local machine:
   ```bash
   git clone https://github.com/kanikakapoorcode/InstaTracker-Instagram-Unfollow-tracker-extension.git
   ```
2. Open **Google Chrome** and navigate to:
   ```
   chrome://extensions/
   ```
3. Enable **Developer mode** by toggling the switch in the top-right corner.
4. Click the **"Load unpacked"** button in the top-left corner.
5. Select the repository root folder.
6. Open your Chrome extensions bar (puzzle icon) and pin **InstaTrack** to your toolbar.

---

## How to Use

1. Ensure you are logged into your account on [Instagram.com](https://instagram.com) in your Chrome browser.
2. Click the **InstaTrack** icon in your toolbar and click **"Open Dashboard"**.
3. Click **"Start Scan"** on the dashboard. The extension will fetch your followers and following lists in parallel.
4. Once completed, your dashboard lists will render:
   - **Who Unfollowed You**: Identifies accounts missing since the last scan (this list will populate starting on your second scan).
   - **Not Following Back**: Identifies accounts that do not follow you back.
5. Click **"View"** next to any username to open their profile in a new tab.
6. Click **"Reset Saved Data"** in the footer to delete the cached snapshot database.
