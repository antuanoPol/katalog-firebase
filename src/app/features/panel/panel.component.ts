import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
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
  imports: [CommonModule, RouterLink, MatTableModule, MatIconModule, MatButtonModule],
  template: `
    <div class="panel-toolbar">
      <button class="back-btn" routerLink="/orders">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <span class="panel-title">Panel statystyk</span>
    </div>

    @if (data.orders().length === 0) {
      <div class="empty-state">
        <div class="empty-icon-wrap">
          <mat-icon>bar_chart</mat-icon>
        </div>
        <p class="empty-title">Brak danych</p>
        <p class="empty-sub">Dodaj zamówienia aby zobaczyć statystyki</p>
      </div>
    } @else {
      <!-- Summary cards -->
      <div class="summary-cards">
        <div class="sum-card">
          <div class="sum-label">Zamówień</div>
          <div class="sum-value">{{ data.orders().length }}</div>
        </div>
        <div class="sum-card">
          <div class="sum-label">Produktów</div>
          <div class="sum-value">{{ totalRow()?.count ?? 0 }}</div>
        </div>
        <div class="sum-card">
          <div class="sum-label">Przychód</div>
          <div class="sum-value amber">{{ totalRow()?.revenue ?? 0 | number:'1.2-2' }} <span class="sum-cur">zł</span></div>
        </div>
        <div class="sum-card profit-card" [class.pos]="(totalRow()?.profit ?? 0) >= 0" [class.neg]="(totalRow()?.profit ?? 0) < 0">
          <div class="sum-label">Łączny zysk</div>
          <div class="sum-value">{{ totalRow()?.profit ?? 0 | number:'1.2-2' }} <span class="sum-cur">zł</span></div>
        </div>
      </div>

      <!-- Table -->
      <div class="panel-table-wrap">
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
            <td mat-cell *matCellDef="let r" [class.total-row]="r.name === 'SUMA'" class="amber-cell">{{ r.revenue | number:'1.2-2' }}</td>
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
    }
  `,
  styles: [`
    .panel-toolbar {
      display: flex; align-items: center; gap: 8px; padding: 12px 16px;
      background: var(--surface); border-bottom: 1px solid var(--border);
      animation: fadeUp .3s ease;
    }
    .back-btn {
      background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px;
      width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--text-muted); transition: all .2s;
    }
    .back-btn:hover { border-color: var(--primary); color: var(--primary); }
    .back-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .panel-title { font-size: 16px; font-weight: 700; color: var(--text); }
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 80px 24px; gap: 8px; animation: fadeIn .5s ease;
    }
    .empty-icon-wrap {
      width: 80px; height: 80px; border-radius: 24px; background: var(--surface-2);
      border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; margin-bottom: 8px;
    }
    .empty-icon-wrap mat-icon { font-size: 36px; width: 36px; height: 36px; color: var(--text-muted); }
    .empty-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--text); }
    .empty-sub { margin: 0; font-size: 13px; color: var(--text-muted); }
    .summary-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 16px; }
    .sum-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius-sm); padding: 14px 16px; transition: border-color .2s;
    }
    .sum-card:hover { border-color: var(--border-amber); }
    .sum-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .1em; font-weight: 700; margin-bottom: 6px; }
    .sum-value { font-size: 20px; font-weight: 700; color: var(--text); }
    .sum-value.amber { color: var(--primary); }
    .sum-cur { font-size: 12px; font-weight: 400; color: var(--text-muted); }
    .profit-card.pos { border-color: rgba(74,222,128,.3); background: rgba(74,222,128,.05); }
    .profit-card.pos .sum-value { color: #4ade80; }
    .profit-card.neg { border-color: rgba(244,63,94,.3); background: rgba(244,63,94,.05); }
    .profit-card.neg .sum-value { color: #f43f5e; }
    .panel-table-wrap { overflow-x: auto; padding: 0 16px 16px; animation: fadeUp .4s ease both; }
    .total-row { font-weight: 700; background: rgba(255,193,7,.08) !important; }
    .amber-cell { color: var(--primary) !important; }
    .profit-pos { color: #4ade80 !important; font-weight: 700; }
    .profit-neg { color: #f43f5e !important; font-weight: 700; }
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

  totalRow = computed(() => {
    const r = this.rows();
    return r.length > 0 ? r[r.length - 1] : null;
  });
}
