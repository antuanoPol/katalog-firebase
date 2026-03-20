# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Angular 17 PWA for managing a product catalog and order profitability calculations, designed for Vinted resellers. UI is in Polish. Backend: Firebase (Auth + Firestore). Deployed to Firebase Hosting.

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

**Firebase:** `@angular/fire@17` (modular API via `importProvidersFrom` in `app.config.ts`).

**Firestore:** All user data stored as a single document at `users/{uid}/katalog`:
```
{ categories: [...], products: [...], orders: [...] }
```

**State management:** `DataService` holds three `signal<>` arrays (`categories`, `products`, `orders`). Every mutation calls the private `mutate()` helper which: (1) applies the change, (2) writes to `localStorage` synchronously, (3) fires a debounced (800ms) Firestore write via an RxJS `Subject`.

## Key Files

| File | Purpose |
|---|---|
| [src/app/app.config.ts](src/app/app.config.ts) | Root providers: router, Firebase, Material animations, service worker |
| [src/app/app.routes.ts](src/app/app.routes.ts) | Routes: `/catalog`, `/orders`, `/panel`, `/login` — all lazy-loaded |
| [src/app/core/models/catalog.models.ts](src/app/core/models/catalog.models.ts) | TypeScript interfaces: `Category`, `Product`, `Order`, `OrderRowCalc` |
| [src/app/core/services/data.service.ts](src/app/core/services/data.service.ts) | Central state + Firestore sync + import/export |
| [src/app/core/services/auth.service.ts](src/app/core/services/auth.service.ts) | Firebase Auth, signals: `user`, `authMode`, `authError`, `isLoading` |
| [src/app/core/services/notification.service.ts](src/app/core/services/notification.service.ts) | `MatSnackBar` wrapper |
| [src/app/core/services/image.service.ts](src/app/core/services/image.service.ts) | Canvas resize → base64 JPEG |
| [src/app/core/guards/auth.guard.ts](src/app/core/guards/auth.guard.ts) | Redirects unauthenticated users to `/login` |
| [src/environments/environment.ts](src/environments/environment.ts) | Firebase config (production) |

## Component Tree

```
AppComponent
├── TopbarComponent          (MatToolbar, user menu, sync dot, import/export)
├── TabBarComponent          (3 tabs with product/order count badges)
└── RouterOutlet
    ├── AuthComponent         (/login — ReactiveForm email+password)
    ├── CatalogComponent      (/catalog)
    │   ├── CategoryGroupComponent  (collapsible, colored header)
    │   │   └── ProductItemComponent
    │   └── opens via MatDialog:
    │       ├── CategoryModalComponent
    │       ├── ProductModalComponent  (image upload via ImageService)
    │       └── OrderModalComponent
    ├── OrdersComponent       (/orders — MatSelect + delete button)
    │   └── OrderDetailComponent  (MatTable, fee inputs, profit calc)
    └── PanelComponent        (/panel — MatTable aggregated stats)
```

## Profit Calculation Logic (OrderDetailComponent)

For each product in an order:
```
deliveryShare  = order.delivery × (product.mass / totalOrderMass)
otherFeesShare = order.otherFees / itemCount
totalCost      = product.price + deliveryShare + otherFeesShare
profit         = sellPrice - totalCost  (null if sellPrice === 0)
```

## PWA

`ng add @angular/pwa` generated `ngsw-worker.js` (replaces old `sw.js`). Config in `ngsw-config.json`. Firebase Firestore URLs excluded from cache (strategy: freshness).

## Deployment

Firebase Hosting serves `dist/katalog-firebase/browser/`. GitHub Actions (`.github/workflows/deploy.yml`) runs `npm ci && npm run build` before deploy on every push to `main`.

## AngularFire Note

`@angular/fire@17` returns `ModuleWithProviders` from its provide functions, so they must be wrapped with `importProvidersFrom()` in `app.config.ts` — not used directly in the `providers` array.
