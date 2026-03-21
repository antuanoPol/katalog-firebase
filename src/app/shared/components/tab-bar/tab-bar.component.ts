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
      transition: color .2s;
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

    /* ── Light theme: move tab bar to top ───────────────── */
    :host-context([data-theme="light"]) {
      order: 1;
    }
    :host-context([data-theme="light"]) .bottom-nav {
      position: sticky;
      top: 60px;
      bottom: auto;
      height: 48px;
      border-top: none;
      border-bottom: 2px solid #e0e0e0;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,.08);
    }
    :host-context([data-theme="light"]) .nav-item {
      font-size: 13px;
      font-weight: 500;
      letter-spacing: .01em;
      text-transform: none;
      flex-direction: row;
      gap: 8px;
      color: rgba(0,0,0,.54);
    }
    :host-context([data-theme="light"]) .nav-item::before {
      top: auto; bottom: -2px;
      height: 2px;
      left: 0; right: 0;
      border-radius: 0;
      background: #3f51b5;
    }
    :host-context([data-theme="light"]) .nav-item.active { color: #3f51b5; }
    :host-context([data-theme="light"]) .nav-item.active mat-icon { transform: none; }
    :host-context([data-theme="light"]) .nav-item mat-icon { font-size: 20px; width: 20px; height: 20px; }
  `],
})
export class TabBarComponent {
  data = inject(DataService);
}
