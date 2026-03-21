import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../../../core/services/data.service';

@Component({
  selector: 'app-tab-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatTabsModule, MatBadgeModule, MatIconModule],
  template: `
    <nav class="tab-nav">
      <a routerLink="/catalog" routerLinkActive="active-tab" class="tab-link">
        <mat-icon [matBadge]="data.productCount() || null" matBadgeSize="small">inventory_2</mat-icon>
        Katalog
      </a>
      <a routerLink="/orders" routerLinkActive="active-tab" class="tab-link">
        <mat-icon [matBadge]="data.orderCount() || null" matBadgeSize="small">local_shipping</mat-icon>
        Zamówienia
      </a>
    </nav>
  `,
  styles: [`
    .tab-nav {
      display: flex;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 64px;
      z-index: 99;
    }
    .tab-link {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px 4px;
      text-decoration: none;
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 500;
      letter-spacing: .04em;
      gap: 2px;
      transition: color .2s, background .2s;
      text-transform: uppercase;
    }
    .tab-link:hover { color: var(--text); background: var(--bg-hover); }
    .tab-link.active-tab {
      color: var(--primary);
      border-bottom: 2px solid var(--primary);
      background: var(--primary-dim);
    }
  `],
})
export class TabBarComponent {
  data = inject(DataService);
}
