import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../../core/services/data.service';

interface PanelRow {
  name: string;
  count: number;
  mass: number;
  purchases: number;
  delivery: number;
  other: number;
  cost: number;
  revenue: number;
  profit: number;
}

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [CommonModule, RouterLink, MatTableModule, MatIconModule, MatCardModule, MatButtonModule],
  template: `
    <div class="panel-toolbar">
      <button mat-icon-button routerLink="/orders" title="Wróć do zamówień">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <span class="panel-title">Panel statystyk</span>
    </div>
    @if (data.orders().length === 0) {
      <div class="empty-state">
        <mat-icon class="empty-icon">bar_chart</mat-icon>
        <p>Brak zamówień.</p>
      </div>
    } @else {
      <mat-card class="panel-card">
        <mat-card-header>
          <mat-card-title>Podsumowanie zamówień</mat-card-title>
        </mat-card-header>
        <div class="table-wrap">
          <table mat-table [dataSource]="rows()">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Zamówienie</th>
              <td mat-cell *matCellDef="let r" [class.total-row]="r.name === 'SUMA'">{{ r.name }}</td>
            </ng-container>
            <ng-container matColumnDef="count">
              <th mat-header-cell *matHeaderCellDef>Prod.</th>
              <td mat-cell *matCellDef="let r" [class.total-row]="r.name === 'SUMA'">{{ r.count }}</td>
            </ng-container>
            <ng-container matColumnDef="mass">
              <th mat-header-cell *matHeaderCellDef>Masa (g)</th>
              <td mat-cell *matCellDef="let r" [class.total-row]="r.name === 'SUMA'">{{ r.mass }}</td>
            </ng-container>
            <ng-container matColumnDef="purchases">
              <th mat-header-cell *matHeaderCellDef>Zakupy</th>
              <td mat-cell *matCellDef="let r" [class.total-row]="r.name === 'SUMA'">{{ r.purchases | number:'1.2-2' }}</td>
            </ng-container>
            <ng-container matColumnDef="delivery">
              <th mat-header-cell *matHeaderCellDef>Dostawa</th>
              <td mat-cell *matCellDef="let r" [class.total-row]="r.name === 'SUMA'">{{ r.delivery | number:'1.2-2' }}</td>
            </ng-container>
            <ng-container matColumnDef="other">
              <th mat-header-cell *matHeaderCellDef>Inne</th>
              <td mat-cell *matCellDef="let r" [class.total-row]="r.name === 'SUMA'">{{ r.other | number:'1.2-2' }}</td>
            </ng-container>
            <ng-container matColumnDef="cost">
              <th mat-header-cell *matHeaderCellDef>Koszt</th>
              <td mat-cell *matCellDef="let r" [class.total-row]="r.name === 'SUMA'">{{ r.cost | number:'1.2-2' }}</td>
            </ng-container>
            <ng-container matColumnDef="revenue">
              <th mat-header-cell *matHeaderCellDef>Przychód</th>
              <td mat-cell *matCellDef="let r" [class.total-row]="r.name === 'SUMA'">{{ r.revenue | number:'1.2-2' }}</td>
            </ng-container>
            <ng-container matColumnDef="profit">
              <th mat-header-cell *matHeaderCellDef>ZYSK</th>
              <td mat-cell *matCellDef="let r"
                [class.total-row]="r.name === 'SUMA'"
                [class.profit-pos]="r.profit >= 0"
                [class.profit-neg]="r.profit < 0">
                {{ r.profit | number:'1.2-2' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      </mat-card>
    }
  `,
  styles: [`
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 80px 24px; color: rgba(0,0,0,.38);
    }
    .empty-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 16px; opacity: .15; }
    .panel-toolbar { display: flex; align-items: center; gap: 8px; padding: 8px 8px 0; animation: fadeUp .3s ease; }
    .panel-title { font-size: 16px; font-weight: 700; letter-spacing: .04em; color: var(--text); text-transform: uppercase; }
    .panel-card { margin: 16px; animation: fadeUp .4s ease both; }
    .table-wrap { overflow-x: auto; }
    .total-row { font-weight: 700; background: rgba(124,58,237,.15) !important; }
    .profit-pos { color: #10b981 !important; font-weight: 700; text-shadow: 0 0 8px rgba(16,185,129,.4); }
    .profit-neg { color: #f43f5e !important; font-weight: 700; text-shadow: 0 0 8px rgba(244,63,94,.4); }
  `],
})
export class PanelComponent {
  data = inject(DataService);
  displayedColumns = ['name', 'count', 'mass', 'purchases', 'delivery', 'other', 'cost', 'revenue', 'profit'];

  rows = computed<PanelRow[]>(() => {
    const products = this.data.products();
    const orderRows: PanelRow[] = this.data.orders().map(ord => {
      const totalMass = ord.items.reduce((s, it) => s + (products.find(p => p.id === it.prodId)?.mass ?? 0), 0);
      let purchases = 0, cost = 0, revenue = 0;
      ord.items.forEach(it => {
        const p = products.find(x => x.id === it.prodId);
        if (!p) return;
        const massPercent = totalMass > 0 ? p.mass / totalMass : 0;
        const dShare = (ord.delivery ?? 0) * massPercent;
        const oShare = ord.items.length > 0 ? (ord.otherFees ?? 0) / ord.items.length : 0;
        purchases += p.price ?? 0;
        cost += (p.price ?? 0) + dShare + oShare;
        revenue += it.sellPrice ?? 0;
      });
      return {
        name: ord.name,
        count: ord.items.length,
        mass: totalMass,
        purchases,
        delivery: ord.delivery ?? 0,
        other: ord.otherFees ?? 0,
        cost,
        revenue,
        profit: revenue - cost,
      };
    });

    if (orderRows.length === 0) return [];

    const total: PanelRow = orderRows.reduce((acc, r) => ({
      name: 'SUMA',
      count: acc.count + r.count,
      mass: acc.mass + r.mass,
      purchases: acc.purchases + r.purchases,
      delivery: acc.delivery + r.delivery,
      other: acc.other + r.other,
      cost: acc.cost + r.cost,
      revenue: acc.revenue + r.revenue,
      profit: acc.profit + r.profit,
    }), { name: 'SUMA', count: 0, mass: 0, purchases: 0, delivery: 0, other: 0, cost: 0, revenue: 0, profit: 0 });

    return [...orderRows, total];
  });
}
