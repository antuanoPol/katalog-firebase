import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { AuthService } from './core/services/auth.service';

const loggedInGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.user()) return router.createUrlTree(['/catalog']);
  return true;
};

export const routes: Routes = [
  { path: '', redirectTo: 'catalog', pathMatch: 'full' },
  {
    path: 'catalog',
    loadComponent: () => import('./features/catalog/catalog.component').then(m => m.CatalogComponent),
    canActivate: [authGuard],
  },
  {
    path: 'orders',
    loadComponent: () => import('./features/orders/orders.component').then(m => m.OrdersComponent),
    canActivate: [authGuard],
  },
  {
    path: 'panel',
    loadComponent: () => import('./features/panel/panel.component').then(m => m.PanelComponent),
    canActivate: [authGuard],
  },
  {
    path: 'history',
    loadComponent: () => import('./features/history/history.component').then(m => m.HistoryComponent),
    canActivate: [authGuard],
  },
  {
    path: 'watched',
    loadComponent: () => import('./features/watched/watched.component').then(m => m.WatchedComponent),
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/auth.component').then(m => m.AuthComponent),
    canActivate: [loggedInGuard],
  },
  {
    path: 'trends',
    loadComponent: () => import('./features/trends/trends.component').then(m => m.TrendsComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'catalog' },
];
