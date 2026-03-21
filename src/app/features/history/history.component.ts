import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { DataService } from '../../core/services/data.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/modals/confirm-dialog/confirm-dialog.component';
import { SaleModalComponent } from '../../shared/modals/sale-modal/sale-modal.component';
import { SaleRecord } from '../../core/models/catalog.models';

interface MonthStat {
  label: string;   // "Mar 2025"
  key: string;     // "2025-03"
  revenue: number;
  profit: number;
  count: number;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="history-page">

      <!-- Toolbar -->
      <div class="h-toolbar">
        <span class="h-title">Historia sprzedaży</span>
        <button class="tool-btn primary" (click)="openSaleModal()">
          <mat-icon>add</mat-icon> Dodaj sprzedaż
        </button>
      </div>

      <!-- Stats cards -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-val">{{ totalRevenue() | number:'1.2-2' }} zł</div>
          <div class="stat-label">Przychód</div>
        </div>
        <div class="stat-card profit">
          <div class="stat-val">{{ totalProfit() | number:'1.2-2' }} zł</div>
          <div class="stat-label">Zysk</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">{{ data.sales().length }}</div>
          <div class="stat-label">Transakcji</div>
        </div>
      </div>

      <!-- Monthly chart -->
      @if (monthStats().length > 0) {
        <div class="chart-section">
          <div class="chart-title">Miesięczne przychody</div>
          <div class="chart-bars">
            @for (m of chartMonths(); track m.key) {
              <div class="bar-col">
                <div class="bar-wrap">
                  <div class="bar profit-bar"
                    [style.height.%]="barHeight(m.profit)"
                    [title]="(m.profit | number:'1.2-2') + ' zł'">
                  </div>
                </div>
                <div class="bar-label">{{ m.label }}</div>
                <div class="bar-val">{{ m.profit | number:'1.0-0' }} zł</div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Sales list -->
      @if (data.sales().length === 0) {
        <div class="empty-state">
          <mat-icon>point_of_sale</mat-icon>
          <p>Brak zapisanych sprzedaży</p>
          <button class="tool-btn primary" (click)="openSaleModal()">
            <mat-icon>add</mat-icon> Dodaj pierwszą sprzedaż
          </button>
        </div>
      } @else {
        <div class="sales-list">
          @for (sale of sortedSales(); track sale.id) {
            <div class="sale-item">
              <div class="sale-info">
                <div class="sale-name">{{ sale.productName }}</div>
                <div class="sale-meta">
                  <span class="sale-date">{{ formatDate(sale.date) }}</span>
                  <span class="sale-platform badge">{{ sale.platform }}</span>
                </div>
              </div>
              <div class="sale-prices">
                <div class="sale-sell">{{ sale.sellPrice | number:'1.2-2' }} zł</div>
                <div class="sale-profit" [class.negative]="(sale.sellPrice - sale.productCost - (sale.extraCosts ?? 0)) < 0">
                  {{ (sale.sellPrice - sale.productCost - (sale.extraCosts ?? 0)) >= 0 ? '+' : '' }}{{ (sale.sellPrice - sale.productCost - (sale.extraCosts ?? 0)) | number:'1.2-2' }} zł
                </div>
              </div>
              <button mat-icon-button (click)="onDelete(sale)" class="del-btn">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .history-page { padding-bottom: 80px; animation: fadeUp .3s ease; }
    .h-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px; background: var(--surface);
      border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 9;
    }
    .h-title { font-size: 16px; font-weight: 700; color: var(--text); }
    .tool-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 10px; border: none;
      font-size: 13px; font-weight: 600; cursor: pointer;
      font-family: inherit; transition: all .2s;
    }
    .tool-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .tool-btn.primary { background: var(--primary); color: #12121f; box-shadow: 0 0 16px rgba(255,193,7,.3); }
    .tool-btn.primary:hover { box-shadow: 0 0 28px rgba(255,193,7,.5); transform: translateY(-1px); }
    .stats-row { display: flex; gap: 12px; padding: 16px; flex-wrap: wrap; }
    .stat-card {
      flex: 1; min-width: 100px; background: var(--surface-2);
      border: 1px solid var(--border); border-radius: 12px;
      padding: 16px; text-align: center;
    }
    .stat-card.profit { border-color: rgba(74,222,128,.3); }
    .stat-val { font-size: 22px; font-weight: 800; color: var(--primary); }
    .stat-card.profit .stat-val { color: #4ade80; }
    .stat-label { font-size: 11px; color: var(--text-muted); font-weight: 600; letter-spacing: .06em; text-transform: uppercase; margin-top: 4px; }
    .chart-section { margin: 0 16px 16px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
    .chart-title { font-size: 12px; font-weight: 700; color: var(--text-muted); letter-spacing: .06em; text-transform: uppercase; margin-bottom: 12px; }
    .chart-bars { display: flex; align-items: flex-end; gap: 8px; height: 140px; }
    .bar-col { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
    .bar-wrap { display: flex; align-items: flex-end; height: 100px; }
    .bar { width: 24px; border-radius: 6px 6px 0 0; min-height: 2px; transition: height .4s ease; }
    .profit-bar { background: #4ade80; }
    .bar-label { font-size: 9px; color: var(--text-muted); font-weight: 600; white-space: nowrap; }
    .bar-val { font-size: 10px; color: #4ade80; font-weight: 700; white-space: nowrap; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 24px; color: var(--text-muted); }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .empty-state p { margin: 0; font-size: 14px; }
    .sales-list { padding: 0 16px; }
    .sale-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 0; border-bottom: 1px solid var(--border);
      animation: fadeUp .3s ease;
    }
    .sale-info { flex: 1; min-width: 0; }
    .sale-name { font-weight: 600; font-size: 14px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sale-meta { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
    .sale-date { font-size: 12px; color: var(--text-muted); }
    .badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-muted); }
    .sale-prices { text-align: right; }
    .sale-sell { font-weight: 700; color: var(--primary); font-size: 15px; }
    .sale-profit { font-size: 12px; color: #4ade80; font-weight: 600; }
    .sale-profit.negative { color: #f43f5e; }
    .del-btn { color: var(--text-muted); opacity: 0; transition: opacity .2s; }
    .sale-item:hover .del-btn { opacity: 1; }
  `],
})
export class HistoryComponent {
  data = inject(DataService);
  private dialog = inject(MatDialog);

  totalRevenue = computed(() => this.data.sales().reduce((s, r) => s + r.sellPrice, 0));
  totalProfit = computed(() => this.data.sales().reduce((s, r) => s + (r.sellPrice - r.productCost - (r.extraCosts ?? 0)), 0));

  sortedSales = computed(() =>
    [...this.data.sales()].sort((a, b) => b.date.localeCompare(a.date))
  );

  monthStats = computed<MonthStat[]>(() => {
    const map = new Map<string, MonthStat>();
    for (const sale of this.data.sales()) {
      const key = sale.date.slice(0, 7); // YYYY-MM
      if (!map.has(key)) {
        const [year, month] = key.split('-');
        const d = new Date(+year, +month - 1, 1);
        map.set(key, {
          key,
          label: d.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' }),
          revenue: 0, profit: 0, count: 0,
        });
      }
      const m = map.get(key)!;
      m.revenue += sale.sellPrice;
      m.profit += sale.sellPrice - sale.productCost - (sale.extraCosts ?? 0);
      m.count++;
    }
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  });

  chartMonths = computed(() => {
    const stats = this.monthStats();
    // Show last 6 months max
    return stats.slice(-6);
  });

  barHeight(value: number): number {
    const max = Math.max(...this.chartMonths().map(m => m.profit), 1);
    return Math.max(2, (value / max) * 100);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  openSaleModal(): void {
    if (this.data.products().length === 0) return;
    this.dialog.open(SaleModalComponent, { width: '400px' });
  }

  onDelete(sale: SaleRecord): void {
    const data: ConfirmDialogData = { message: `Usunąć sprzedaż "${sale.productName}"?` };
    this.dialog.open(ConfirmDialogComponent, { width: '320px', data })
      .afterClosed().subscribe(ok => { if (ok) this.data.deleteSale(sale.id); });
  }
}
