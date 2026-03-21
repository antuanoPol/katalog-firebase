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
      background: rgba(5,5,10,.6);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255,255,255,.06);
      position: sticky; top: 64px; z-index: 99;
    }
    .tab-link {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      padding: 10px 4px; text-decoration: none; color: var(--text-muted);
      font-size: 10px; font-weight: 600; letter-spacing: .08em; gap: 3px;
      transition: color .25s, background .25s; text-transform: uppercase;
      position: relative;
    }
    .tab-link mat-icon { font-size: 20px; width: 20px; height: 20px; transition: transform .25s, filter .25s; }
    .tab-link:hover { color: var(--text); }
    .tab-link:hover mat-icon { transform: translateY(-2px); }
    .tab-link.active-tab { color: #a78bfa; }
    .tab-link.active-tab mat-icon { filter: drop-shadow(0 0 6px #a78bfa); transform: translateY(-2px); }
    .tab-link.active-tab::after {
      content: ''; position: absolute; bottom: 0; left: 20%; right: 20%;
      height: 2px; border-radius: 2px 2px 0 0;
      background: linear-gradient(90deg, #7c3aed, #a78bfa);
      box-shadow: 0 0 8px #a78bfa;
      animation: fadeIn .3s ease;
    }
  `],
})
export class TabBarComponent {
  data = inject(DataService);
}
