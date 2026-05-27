# DO Warehouse - AI Context & Architecture Guide

> **Note to future AI Assistants:** Read this file to understand the architecture, history, and context of this project before making modifications.

## 📌 Project Overview
**DO Warehouse** is a lightweight, fully serverless Inventory Management Progressive Web App (PWA). 
It allows the user to track inventory items (laptops, bags, accessories, etc.) and logs all activities (adding, removing, editing stock).

## 🏗️ Architecture (Serverless PWA)
This project originally started as a PHP/MySQL app, was briefly converted to an Electron desktop app, but is now a **100% Client-Side Progressive Web App (PWA)** hosted on GitHub Pages.
- **Frontend:** Vanilla HTML, CSS (styles.css), and JavaScript (app.js). No frameworks (No React/Vue).
- **Backend / Database:** Entirely serverless. It uses the **Google Drive API** as the database.
- **Hosting:** GitHub Pages.

## 💾 Data Storage & Google Drive Sync (`drive.js`)
Instead of a traditional database, the app stores data in two JSON files directly in the user's personal Google Drive inside a folder named `DO Warehouse`:
1. `item-data.json` - Contains the current inventory stock.
2. `log-data.json` - Contains the history of all transactions/movements.

**How Syncing Works:**
- The logic is handled entirely in `drive.js`.
- It uses the Google Drive REST API (`https://www.googleapis.com/drive/v3/files`).
- When the app loads, it fetches the files from Drive and loads them into memory.
- Every time a user adds/removes an item, the app updates the local memory and **immediately pushes the updated JSON array back to Google Drive** via `driveWrite()`.
- **OAuth 2.0:** Authentication is handled via Implicit Flow (token in URL hash). The OAuth Client ID is hardcoded in `drive.js`.

## 🌐 PWA & Service Worker (`service-worker.js`)
The app is fully installable on Windows, Android, and iOS.
- **Offline Support:** It uses a `service-worker.js` to cache all assets (`app.js`, `styles.css`, `index.html`, etc.).
- **Update Strategy:** The service worker uses a **Stale-While-Revalidate** strategy for local assets. This means it instantly loads from the cache for speed, but silently fetches the newest version from GitHub in the background. The user will see the newest version the *next* time they open the app. There is no need to manually bump cache version numbers when pushing updates.
- **Manifest:** Configured in `manifest.json`.

## 📂 File Structure
- `index.html` - The main UI (formerly app.html).
- `app.js` - Main application logic (UI rendering, search, filtering, adding/removing items).
- `drive.js` - Google Drive API wrapper, authentication, and file sync logic.
- `styles.css` - Custom styling (Vanilla CSS, dark mode support).
- `translations.js` - Multi-language support mapping.
- `service-worker.js` - PWA caching and offline logic.
- `manifest.json` - PWA installation config.
- `icons/` - App icons for PWA installation.

## ⚠️ Important Quirks & Rules for Modification
1. **No Backend:** Do not write Node.js, PHP, or Python scripts for this app. It must remain 100% client-side HTML/JS.
2. **Google API Scopes:** The app uses `https://www.googleapis.com/auth/drive.file` scope, meaning it can ONLY see and modify files that the app itself created. It cannot read the user's personal Drive files.
3. **Vanilla JS Only:** Stick to Vanilla JavaScript. Do not introduce Webpack, Babel, or frameworks unless explicitly requested by the user.
4. **DOM Manipulation:** `app.js` heavily relies on direct DOM manipulation (`document.getElementById`). Ensure HTML IDs match JS selectors when editing the UI.

## 📝 Chat History & Changelog
**[2026-05-24] - Migration to Google Drive & Serverless PWA**
- **User Request:** The user wanted to get away from a local PHP server and move the data to a cloud database so it could be accessed from an Android phone and Windows app without data loss.
- **Action Taken:** We completely stripped out the PHP/MySQL backend. We wrote a custom Google Drive API integration in `drive.js` to store data in `item-data.json` and `log-data.json` directly in the user's personal Google Drive. 
- **Action Taken:** We briefly attempted to build an Electron Windows `.exe` to wrap the app, but ran into some local symlink build issues. We then decided to pivot to a 100% Progressive Web App (PWA) model hosted on GitHub Pages.
- **Action Taken:** We wrote a one-time migration script to pull their local PHP JSON data and upload it to their new empty Google Drive database.
- **Action Taken:** We updated `service-worker.js` to use a `Stale-While-Revalidate` strategy, ensuring the PWA updates automatically in the background whenever the user pushes new code to GitHub Pages. All obsolete Electron and PHP files were successfully deleted from the root directory.

**[2026-05-27] - Counter Tab Enhancements & Offline Robustification**
- **Action Taken:** Updated the Counter Tab so scanning transfers can directly mirror the Inventory Stock Management functionality. Transferred tallies now support Received/Sent/Adjust logic and feature a live stock lookup badge.
- **Action Taken:** Integrated the Edit Modal and Stock Modal. Clicking any item opens the Edit modal first, which now contains a dedicated "Stock" button to seamlessly switch into stock transaction mode.
- **Action Taken:** Addressed an offline logging bug where `logActivity` was attempting a network `fetch` to a nonexistent Node backend. Logs are now securely written to local storage and Google Drive via `driveWrite`.
- **Action Taken:** Added an auto-populate mechanism to generate mock data if the inventory is completely empty, ensuring easier testing for new environments.
