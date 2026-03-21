import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../../../core/services/data.service';

@Component({
  selector: 'app-tab-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatBadgeModule, MatIconModule],
  template: `
    <nav class="bottom-nav">
      <a routerLink="/catalog" routerLinkActive="active" class="nav-item">
        <div class="nav-icon-wrap">
          <mat-icon [matBadge]="data.productCount() || null" matBadgeSize="small">inventory_2</mat-icon>
        </div>
        <span class="nav-label">Katalog</span>
      </a>
      <a routerLink="/orders" routerLinkActive="active" class="nav-item">
        <div class="nav-icon-wrap">
          <mat-icon [matBadge]="data.orderCount() || null" matBadgeSize="small">local_shipping</mat-icon>
        </div>
        <span class="nav-label">Zamówienia</span>
      </a>
      <a routerLink="/history" routerLinkActive="active" class="nav-item">
        <div class="nav-icon-wrap">
          <mat-icon [matBadge]="data.sales().length || null" matBadgeSize="small">sell</mat-icon>
        </div>
        <span class="nav-label">Sprzedaż</span>
      </a>
    </nav>
  `,
  styles: [`
    /* ── Mobile: fixed bottom nav ─────────────────────── */
    .bottom-nav {
      position: fixed; bottom: 0; left: 0; right: 0;
      display: flex; height: 68px;
      background: var(--surface);
      border-top: 1px solid var(--border);
      z-index: 100;
      padding-bottom: env(safe-area-inset-bottom, 0);
    }
    .nav-item {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 3px; text-decoration: none;
      color: var(--text-muted);
      font-size: 10px; font-weight: 600;
      letter-spacing: .06em; text-transform: uppercase;
      transition: color .2s, background .2s;
      position: relative;
    }
    .nav-item::before {
      content: '';
      position: absolute; top: 0; left: 25%; right: 25%; height: 2px;
      background: var(--primary);
      border-radius: 0 0 4px 4px;
      opacity: 0; transition: opacity .2s;
    }
    .nav-item.active { color: var(--primary); }
    .nav-item.active::before { opacity: 1; }
    .nav-icon-wrap { position: relative; }
    .nav-item mat-icon { font-size: 22px; width: 22px; height: 22px; transition: transform .2s; }
    .nav-item.active mat-icon { transform: translateY(-1px); }

    /* ── Desktop: sidebar ─────────────────────────────── */
    @media (min-width: 768px) {
      :host { display: flex; flex-shrink: 0; }
      .bottom-nav {
        position: sticky; top: 0; bottom: auto;
        left: auto; right: auto;
        flex-direction: column; justify-content: flex-start; align-items: stretch;
        width: 200px; height: calc(100dvh - 60px);
        border-top: none; border-right: 1px solid var(--border);
        padding: 8px 0;
      }
      .nav-item {
        flex: unset; flex-direction: row;
        justify-content: flex-start; align-items: center;
        height: 52px; padding: 0 20px; gap: 12px;
        font-size: 13px; font-weight: 600;
        letter-spacing: .02em; text-transform: none;
      }
      .nav-item::before {
        top: 8px; bottom: 8px; left: 0; right: auto;
        width: 3px; height: auto; border-radius: 0 4px 4px 0;
      }
      .nav-item.active mat-icon { transform: none; }
      .nav-item mat-icon { font-size: 20px; width: 20px; height: 20px; }
    }

    /* ── Light theme desktop sidebar ─────────────────── */
    @media (min-width: 768px) {
      :host-context([data-theme="light"]) .bottom-nav {
        background: #3f51b5; border-right: none;
        box-shadow: 2px 0 8px rgba(0,0,0,.15);
      }
      :host-context([data-theme="light"]) .nav-item { color: rgba(255,255,255,.75); }
      :host-context([data-theme="light"]) .nav-item:hover { color: white; background: rgba(255,255,255,.12); }
      :host-context([data-theme="light"]) .nav-item.active { color: white; background: rgba(255,255,255,.18); }
      :host-context([data-theme="light"]) .nav-item::before { background: white; }
    }
  `],
})
export class TabBarComponent {
  data = inject(DataService);
}
