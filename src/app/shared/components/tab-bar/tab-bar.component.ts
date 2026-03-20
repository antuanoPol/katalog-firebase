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
      <a routerLink="/panel" routerLinkActive="active-tab" class="tab-link">
        <mat-icon>bar_chart</mat-icon>
        Panel
      </a>
    </nav>
  `,
  styles: [`
    .tab-nav {
      display: flex;
      background: white;
      border-bottom: 1px solid #e0e0e0;
      position: sticky;
      top: 64px;
      z-index: 99;
    }
    .tab-link {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 4px;
      text-decoration: none;
      color: rgba(0,0,0,.54);
      font-size: 11px;
      gap: 2px;
      transition: color .2s;
    }
    .tab-link.active-tab {
      color: #3f51b5;
      border-bottom: 2px solid #3f51b5;
    }
  `],
})
export class TabBarComponent {
  data = inject(DataService);
}
