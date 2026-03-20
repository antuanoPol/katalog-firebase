# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-file vanilla JavaScript PWA for managing a product catalog and order profitability calculations, designed for Vinted resellers. UI is in Polish.

## Deployment

No build step — the app is pure HTML/CSS/JS served directly from the root.

**Deploy to Firebase Hosting:**
```bash
firebase deploy --only hosting
```

**Local development:** Open `index.html` directly in a browser, or use any static file server:
```bash
npx serve .
```

Deployment to production is automated via GitHub Actions on push to `main` (requires `FIREBASE_TOKEN` secret).

## Architecture

The entire application lives in a single file: `index.html` (≈1300 lines). There is no build system, no package manager, no framework.

**Backend:** Firebase (project `vinted-kosztorys`)
- Auth: Email/password via Firebase Authentication
- Database: Firestore — all user data stored at `users/{uid}/katalog` as a single document

**Data shape stored in Firestore:**
```
{
  categories: [{ id, name, collapsed }],
  products:   [{ id, catId, name, price, mass, img, link, desc }],
  orders:     [{ id, name, color, delivery, otherFees, items: [{ prodId, sellPrice }] }]
}
```

**State management:** One global `state` object in memory, mirrored to Firestore via a debounced `saveData()` (800ms). On login, data is loaded from Firestore and cached in `localStorage` for offline use.

**Views (tabs):** Catalog → Orders → Panel (analytics). Switching tabs calls `switchView()` and re-renders the active view.

**Service Worker** (`sw.js`): Cache-first strategy, cache name `katalog-v2`. Caches HTML, manifest, and icons. Excludes API calls.

## Key Functions in index.html

| Function | Purpose |
|---|---|
| `loadData()` / `saveData()` | Firestore read/write (saveData is debounced 800ms) |
| `renderCatalog()` | Renders all products grouped by category |
| `renderOrder()` | Renders order with profit breakdown |
| `renderPanel()` | Renders analytics/statistics table |
| `saveProd()` / `deleteProd()` | CRUD for products |
| `saveCat()` / `deleteCat()` | CRUD for categories |
| `saveOrder()` | Create order from selected products |
| `doExportJson()` / `doImportJson()` | JSON backup/restore |
| `doExportXlsx()` | Excel export (loads XLSX library on demand) |
| `uid()` | UUID generator; `x()` HTML escape; `fmt()` number formatter |
| `notify()` | Toast notification |

## Firebase Config

The Firebase config (API key, project ID, etc.) is hardcoded in `index.html`. The Firebase API key for web clients is intentionally public — security is enforced via Firestore Security Rules in the Firebase console, not by keeping the key secret.