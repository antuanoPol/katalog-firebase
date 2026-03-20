# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Angular 17 PWA for managing a product catalog and order profitability calculations, designed for Vinted resellers. UI is in Polish. Backend: Firebase (Auth + Firestore). Deployed to Firebase Hosting via GitHub Actions.

## Commands

```bash
npm start              # dev server at localhost:4200
ng serve               # same
npm run build          # production build → dist/katalog-firebase/browser/
firebase serve --only hosting   # test production build locally
firebase deploy --only hosting  # manual deploy
```

## Architecture

**Framework:** Angular 17 standalone components, Angular Material UI, Angular Signals for state.

**Firebase:** `@angular/fire@17.0.0` (modular API). Providers must be wrapped with `importProvidersFrom()` in `app.config.ts` because `@angular/fire@17` returns `ModuleWithProviders<T>`, not `EnvironmentProviders` — direct use in `providers[]` causes a TS2322 error.

**Firestore:** All user data stored as a single document at `users/{uid}/katalog/katalog` (subcollection `katalog`, document `katalog`):
```
{ categories: [...], products: [...], orders: [...] }
```
On first login with no data, `SAMPLE_DATA` (demo categories + products) is written to Firestore.

**State management:** `DataService` holds three `signal<>` arrays (`categories`, `products`, `orders`) plus `syncState` signal (`'synced' | 'saving' | 'offline'`). Every mutation calls the private `mutate()` helper which: (1) applies the change synchronously, (2) writes to `localStorage` (`katalog_cache` key), (3) fires a debounced (800ms) Firestore write via an RxJS `Subject` + `switchMap`.

**Offline fallback:** On `loadData()` failure, data is read from `localStorage`. The sync dot in the topbar reflects the current `syncState`.

## Key Files

| File | Purpose |
|---|---|
| [src/app/app.config.ts](src/app/app.config.ts) | Root providers: router, Firebase (`importProvidersFrom`), Material animations, service worker |
| [src/app/app.routes.ts](src/app/app.routes.ts) | Routes: `/catalog`, `/orders`, `/panel`, `/login` — all lazy-loaded via `loadComponent` |
| [src/app/core/models/catalog.models.ts](src/app/core/models/catalog.models.ts) | TypeScript interfaces: `Category`, `Product`, `OrderItem`, `OrderColor`, `Order`, `AppState`, `OrderRowCalc` |
| [src/app/core/services/data.service.ts](src/app/core/services/data.service.ts) | Central state + Firestore sync + localStorage cache + import/export |
| [src/app/core/services/auth.service.ts](src/app/core/services/auth.service.ts) | Firebase Auth wrapper; signals: `user`, `authMode`, `authError`, `isLoading` |
| [src/app/core/services/notification.service.ts](src/app/core/services/notification.service.ts) | `MatSnackBar` wrapper — `notify(msg)` shows snack for 2500ms |
| [src/app/core/services/image.service.ts](src/app/core/services/image.service.ts) | Canvas resize to max 800px → base64 JPEG at 0.8 quality |
| [src/app/core/guards/auth.guard.ts](src/app/core/guards/auth.guard.ts) | `CanActivateFn` — redirects unauthenticated users to `/login` |
| [src/environments/environment.ts](src/environments/environment.ts) | Firebase config (projectId: `vinted-kosztorys`) |
| [src/environments/environment.development.ts](src/environments/environment.development.ts) | Same config used during `ng serve` |

## Component Tree

```
AppComponent
├── TopbarComponent          (MatToolbar, sync dot, user menu: backup/import/XLSX/logout)
├── TabBarComponent          (3 routerLink tabs with MatBadge counts)
└── RouterOutlet
    ├── AuthComponent         (/login — ReactiveForm, MatTabGroup for login/register)
    ├── CatalogComponent      (/catalog — selectMode, selectedIds signals, lightbox)
    │   ├── CategoryGroupComponent  (collapsible, 10-color header, sticky top: 61px)
    │   │   └── ProductItemComponent  (expandable desc, image, edit/delete/select)
    │   └── opens via MatDialog:
    │       ├── CategoryModalComponent   (name + duplicate check)
    │       ├── ProductModalComponent    (ReactiveForm, ImageService upload, create/edit)
    │       └── OrderModalComponent      (name auto-filled with today's date)
    ├── OrdersComponent       (/orders — MatSelect driven by signal, delete button)
    │   └── OrderDetailComponent  (MatTable, delivery/otherFees inputs, profit calc)
    └── PanelComponent        (/panel — MatTable aggregated stats with SUMA totals row)
```

## Profit Calculation Logic (OrderDetailComponent)

For each product in an order:
```
deliveryShare  = order.delivery × (product.mass / totalOrderMass)
otherFeesShare = order.otherFees / itemCount
totalCost      = product.price + deliveryShare + otherFeesShare
profit         = sellPrice - totalCost  (null if sellPrice === 0)
```

## Angular Signals — Important Pattern

`computed()` only tracks `signal` reads — it does **not** react to plain property access. All reactive values used inside `computed()` must be signals. Example: `selectedOrderId` in `OrdersComponent` is `signal<string>('')`, not a plain string — otherwise the `selectedOrder` computed never updates.

## Sticky Headers — Layout Note

The main scroll container is `.content main` (overflow-y: auto). Sticky `top` values are relative to this scroll container, not the viewport:
- `.catalog-toolbar`: `top: 0` (sticks to the top of the scroll area)
- `.cat-header`: `top: 61px` (sticks just below the toolbar, which is ~61px tall)

Do not change these to viewport-relative values.

## PWA

`ngsw-worker.js` generated by `@angular/pwa`. Config in `ngsw-config.json`. Firestore URLs excluded from SW cache (`strategy: freshness, maxSize: 0`) to prevent stale data.

## Deployment

Firebase Hosting serves `dist/katalog-firebase/browser/`. GitHub Actions (`.github/workflows/deploy.yml`) triggers on push to `main`:
1. `npm ci --legacy-peer-deps` (required due to `@angular/fire@17` peer dependency conflict)
2. `npm run build -- --configuration production`
3. `FirebaseExtended/action-hosting-deploy@v0` deploys to project `vinted-kosztorys`

Secret required: `FIREBASE_TOKEN` in repository settings.
