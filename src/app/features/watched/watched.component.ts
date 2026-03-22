import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { DataService } from '../../core/services/data.service';
import { WatchedItem } from '../../core/models/catalog.models';
import { WatchedModalComponent, WatchedModalData } from './watched-modal/watched-modal.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/modals/confirm-dialog/confirm-dialog.component';

type FilterTab = 'all' | 'watching' | 'bought' | 'sold';

@Component({
  selector: 'app-watched',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="watched-page">

      <!-- Fixed top -->
      <div class="w-fixed">
        <div class="w-toolbar">
          <span class="w-title">Obserwowane</span>
          <button class="add-btn" (click)="openModal(null)">
            <mat-icon>add</mat-icon> Dodaj
          </button>
        </div>

        <!-- Filter tabs -->
        <div class="filter-tabs">
          <button class="ftab" [class.active]="filter() === 'all'" (click)="filter.set('all')">
            Wszystkie <span class="ftab-count">{{ data.watched().length }}</span>
          </button>
          <button class="ftab" [class.active]="filter() === 'watching'" (click)="filter.set('watching')">
            Obserwuję <span class="ftab-count">{{ countByStatus('watching') }}</span>
          </button>
          <button class="ftab" [class.active]="filter() === 'bought'" (click)="filter.set('bought')">
            Kupione <span class="ftab-count">{{ countByStatus('bought') }}</span>
          </button>
          <button class="ftab" [class.active]="filter() === 'sold'" (click)="filter.set('sold')">
            Sprzedane <span class="ftab-count">{{ countByStatus('sold') }}</span>
          </button>
        </div>

        <!-- Analytics (only when sold tab or all and there are sold items) -->
        @if (soldItems().length > 0 && (filter() === 'sold' || filter() === 'all')) {
          <div class="analytics">

            <!-- Summary pills -->
            <div class="summary-row">
              <div class="summary-pill">
                <div class="sum-val">{{ totalProfit() | number:'1.0-0' }} zł</div>
                <div class="sum-label">Łączny zysk</div>
              </div>
              <div class="summary-pill">
                <div class="sum-val">{{ avgProfit() | number:'1.0-0' }} zł</div>
                <div class="sum-label">Śr. zysk</div>
              </div>
              <div class="summary-pill">
                <div class="sum-val">{{ soldItems().length }}</div>
                <div class="sum-label">Sprzedanych</div>
              </div>
            </div>

            <!-- Category heatmap -->
            @if (categoryStats().length > 0) {
              <div class="heat-section">
                <div class="heat-title">Kategorie</div>
                <div class="heat-grid">
                  @for (c of categoryStats(); track c.name) {
                    <div class="heat-cell" [style.background]="heatColor(c.count, maxCatCount())"
                      [title]="c.name + ': ' + c.count + ' szt., zysk śr. ' + (c.avgProfit | number:'1.0-0') + ' zł'">
                      <div class="heat-cell-name">{{ c.name }}</div>
                      <div class="heat-cell-count">{{ c.count }}</div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Size heatmap -->
            @if (sizeStats().length > 0) {
              <div class="heat-section">
                <div class="heat-title">Rozmiary</div>
                <div class="heat-grid size-grid">
                  @for (s of sizeStats(); track s.name) {
                    <div class="heat-cell size-cell" [style.background]="heatColor(s.count, maxSizeCount())"
                      [title]="'Rozmiar ' + s.name + ': ' + s.count + ' szt.'">
                      <div class="heat-cell-name">{{ s.name }}</div>
                      <div class="heat-cell-count">{{ s.count }}</div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Brand bars -->
            @if (brandStats().length > 0) {
              <div class="heat-section">
                <div class="heat-title">Marki — śr. zysk</div>
                <div class="brand-bars">
                  @for (b of brandStats(); track b.name) {
                    <div class="brand-row">
                      <div class="brand-name">{{ b.name }}</div>
                      <div class="brand-bar-wrap">
                        <div class="brand-bar" [style.width.%]="(b.avgProfit / maxBrandProfit()) * 100"></div>
                      </div>
                      <div class="brand-val">{{ b.avgProfit | number:'1.0-0' }} zł</div>
                    </div>
                  }
                </div>
              </div>
            }

          </div>
        }
      </div><!-- /w-fixed -->

      <!-- Scrollable list -->
      <div class="w-scroll">
        @if (filteredItems().length === 0) {
          <div class="empty-state">
            <mat-icon>visibility</mat-icon>
            <p>{{ emptyMessage() }}</p>
          </div>
        } @else {
          <div class="w-list">
            @for (item of filteredItems(); track item.id) {
              <div class="w-item" [class]="'status-' + item.status">
                <div class="w-item-top">
                  <div class="w-info">
                    <div class="w-name">{{ item.name }}</div>
                    <div class="w-meta">
                      @if (item.category) { <span class="meta-chip">{{ item.category }}</span> }
                      @if (item.size) { <span class="meta-chip">{{ item.size }}</span> }
                      @if (item.brand) { <span class="meta-chip brand-chip">{{ item.brand }}</span> }
                    </div>
                  </div>
                  <div class="w-prices">
                    <div class="w-buy">{{ item.buyPrice | number:'1.2-2' }} zł</div>
                    @if (item.status === 'sold' && item.sellPrice) {
                      <div class="w-profit" [class.neg]="(item.sellPrice - item.buyPrice) < 0">
                        {{ (item.sellPrice - item.buyPrice) >= 0 ? '+' : '' }}{{ (item.sellPrice - item.buyPrice) | number:'1.2-2' }} zł
                      </div>
                    }
                  </div>
                </div>
                <div class="w-item-bot">
                  <span class="status-chip status-{{ item.status }}">{{ statusLabel(item.status) }}</span>
                  @if (item.platform) { <span class="platform-chip">{{ item.platform }}</span> }
                  @if (item.link) {
                    <a class="link-btn" [href]="item.link" target="_blank" rel="noopener">
                      <mat-icon>open_in_new</mat-icon>
                    </a>
                  }
                  <div class="w-actions">
                    @if (item.status === 'watching') {
                      <button class="action-btn buy" (click)="setStatus(item, 'bought')" title="Oznacz jako kupione">
                        <mat-icon>shopping_bag</mat-icon>
                      </button>
                    }
                    @if (item.status === 'bought') {
                      <button class="action-btn sell" (click)="setStatus(item, 'sold')" title="Oznacz jako sprzedane">
                        <mat-icon>sell</mat-icon>
                      </button>
                    }
                    <button class="action-btn edit" (click)="openModal(item)" title="Edytuj">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button class="action-btn del" (click)="onDelete(item)" title="Usuń">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div><!-- /w-scroll -->

    </div>
  `,
  styles: [`
    .watched-page { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
    .w-fixed { flex-shrink: 0; background: var(--surface); border-bottom: 1px solid var(--border); }
    .w-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y; padding-bottom: 80px; }

    /* Toolbar */
    .w-toolbar {
      display: flex; align-items: center; gap: 8px; padding: 12px 16px 8px;
    }
    .w-title { font-size: 16px; font-weight: 700; color: var(--text); flex: 1; }
    .add-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 7px 14px; border-radius: 10px; border: none;
      background: var(--primary); color: #12121f;
      font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
    }
    .add-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Filter tabs */
    .filter-tabs {
      display: flex; gap: 0; padding: 0 16px 10px; overflow-x: auto;
    }
    .ftab {
      display: flex; align-items: center; gap: 5px;
      padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border);
      background: var(--surface-2); color: var(--text-muted);
      font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit;
      white-space: nowrap; margin-right: 6px; transition: all .2s;
    }
    .ftab.active { border-color: var(--border-amber); color: var(--primary); background: rgba(255,193,7,.08); }
    .ftab-count {
      font-size: 10px; background: var(--surface-3); border-radius: 10px;
      padding: 1px 6px; color: var(--text-muted);
    }
    .ftab.active .ftab-count { background: rgba(255,193,7,.15); color: var(--primary); }

    /* Analytics */
    .analytics { padding: 0 16px 12px; display: flex; flex-direction: column; gap: 12px; }
    .summary-row { display: flex; gap: 8px; }
    .summary-pill {
      flex: 1; background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 10px; padding: 8px; text-align: center;
    }
    .sum-val { font-size: clamp(13px, 4vw, 20px); font-weight: 800; color: var(--primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sum-label { font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: .06em; margin-top: 2px; }

    /* Heatmaps */
    .heat-section { }
    .heat-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text-muted); margin-bottom: 6px; }
    .heat-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .heat-cell {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      border-radius: 8px; padding: 6px 10px; min-width: 60px;
      transition: transform .15s; cursor: default;
    }
    .heat-cell:hover { transform: scale(1.05); }
    .heat-cell-name { font-size: 11px; font-weight: 700; color: rgba(255,255,255,.9); }
    .heat-cell-count { font-size: 18px; font-weight: 800; color: white; line-height: 1; }
    .size-cell { min-width: 44px; padding: 6px 8px; }
    .size-grid { gap: 4px; }

    /* Brand bars */
    .brand-bars { display: flex; flex-direction: column; gap: 6px; }
    .brand-row { display: flex; align-items: center; gap: 8px; }
    .brand-name { font-size: 12px; font-weight: 600; color: var(--text); min-width: 70px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .brand-bar-wrap { flex: 1; height: 8px; background: var(--surface-2); border-radius: 4px; overflow: hidden; }
    .brand-bar { height: 100%; background: #4ade80; border-radius: 4px; transition: width .4s ease; }
    .brand-val { font-size: 11px; font-weight: 700; color: #4ade80; min-width: 50px; text-align: right; }

    /* List */
    .w-list { padding: 0 16px; }
    .w-item {
      border-bottom: 1px solid var(--border);
      padding: 12px 0;
      border-left: 3px solid transparent;
      padding-left: 10px;
      margin-left: -10px;
      animation: fadeUp .3s ease both;
    }
    .w-item.status-watching { border-left-color: #38bdf8; }
    .w-item.status-bought { border-left-color: var(--primary); }
    .w-item.status-sold { border-left-color: #4ade80; }
    .w-item-top { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
    .w-info { flex: 1; min-width: 0; }
    .w-name { font-weight: 600; font-size: 14px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .w-meta { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px; }
    .meta-chip {
      font-size: 10px; font-weight: 600; padding: 1px 7px; border-radius: 20px;
      background: var(--surface-2); border: 1px solid var(--border); color: var(--text-muted);
    }
    .brand-chip { color: #a78bfa; border-color: rgba(167,139,250,.3); background: rgba(167,139,250,.08); }
    .w-prices { text-align: right; flex-shrink: 0; }
    .w-buy { font-weight: 700; color: var(--primary); font-size: 14px; }
    .w-profit { font-size: 12px; color: #4ade80; font-weight: 600; }
    .w-profit.neg { color: #f43f5e; }
    .w-item-bot { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .status-chip {
      font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px;
    }
    .status-chip.status-watching { background: rgba(56,189,248,.12); color: #38bdf8; border: 1px solid rgba(56,189,248,.3); }
    .status-chip.status-bought { background: rgba(255,193,7,.12); color: var(--primary); border: 1px solid var(--border-amber); }
    .status-chip.status-sold { background: rgba(74,222,128,.12); color: #4ade80; border: 1px solid rgba(74,222,128,.3); }
    .platform-chip {
      font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px;
      background: var(--surface-2); border: 1px solid var(--border); color: var(--text-muted);
    }
    .link-btn {
      display: flex; align-items: center; color: var(--text-muted); text-decoration: none;
      transition: color .2s;
    }
    .link-btn:hover { color: var(--primary); }
    .link-btn mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .w-actions { margin-left: auto; display: flex; gap: 2px; }
    .action-btn {
      background: none; border: none; cursor: pointer; padding: 4px;
      border-radius: 6px; display: flex; align-items: center; color: var(--text-muted);
      transition: color .2s, background .2s;
    }
    .action-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .action-btn.buy:hover { color: var(--primary); background: rgba(255,193,7,.1); }
    .action-btn.sell:hover { color: #4ade80; background: rgba(74,222,128,.1); }
    .action-btn.edit:hover { color: #38bdf8; background: rgba(56,189,248,.1); }
    .action-btn.del:hover { color: #f43f5e; background: rgba(244,63,94,.1); }

    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 24px; color: var(--text-muted); }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .empty-state p { margin: 0; font-size: 14px; }
  `],
})
export class WatchedComponent {
  data = inject(DataService);
  private dialog = inject(MatDialog);

  filter = signal<FilterTab>('all');

  filteredItems = computed(() => {
    const f = this.filter();
    const items = this.data.watched();
    if (f === 'all') return items;
    return items.filter(x => x.status === f);
  });

  soldItems = computed(() => this.data.watched().filter(x => x.status === 'sold' && x.sellPrice != null));

  totalProfit = computed(() =>
    this.soldItems().reduce((s, x) => s + (x.sellPrice! - x.buyPrice), 0)
  );

  avgProfit = computed(() => {
    const sold = this.soldItems();
    if (!sold.length) return 0;
    return this.totalProfit() / sold.length;
  });

  countByStatus(status: WatchedItem['status']): number {
    return this.data.watched().filter(x => x.status === status).length;
  }

  statusLabel(status: WatchedItem['status']): string {
    return { watching: 'Obserwuję', bought: 'Kupione', sold: 'Sprzedane' }[status];
  }

  emptyMessage(): string {
    const msgs: Record<FilterTab, string> = {
      all: 'Brak obserwowanych przedmiotów',
      watching: 'Brak obserwowanych',
      bought: 'Brak kupionych',
      sold: 'Brak sprzedanych',
    };
    return msgs[this.filter()];
  }

  // ── Analytics ──────────────────────────────────────────────────

  categoryStats = computed(() => {
    const map = new Map<string, { count: number; profitSum: number }>();
    for (const x of this.soldItems()) {
      const key = x.category || 'Inne';
      const cur = map.get(key) ?? { count: 0, profitSum: 0 };
      cur.count++;
      cur.profitSum += x.sellPrice! - x.buyPrice;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, count: v.count, avgProfit: v.profitSum / v.count }))
      .sort((a, b) => b.count - a.count);
  });

  maxCatCount = computed(() => Math.max(...this.categoryStats().map(c => c.count), 1));

  sizeStats = computed(() => {
    const map = new Map<string, number>();
    for (const x of this.soldItems()) {
      if (!x.size) continue;
      map.set(x.size, (map.get(x.size) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  });

  maxSizeCount = computed(() => Math.max(...this.sizeStats().map(s => s.count), 1));

  brandStats = computed(() => {
    const map = new Map<string, { count: number; profitSum: number }>();
    for (const x of this.soldItems()) {
      if (!x.brand) continue;
      const cur = map.get(x.brand) ?? { count: 0, profitSum: 0 };
      cur.count++;
      cur.profitSum += x.sellPrice! - x.buyPrice;
      map.set(x.brand, cur);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, avgProfit: v.profitSum / v.count }))
      .sort((a, b) => b.avgProfit - a.avgProfit)
      .slice(0, 8);
  });

  maxBrandProfit = computed(() => Math.max(...this.brandStats().map(b => b.avgProfit), 1));

  heatColor(count: number, max: number): string {
    const intensity = max > 0 ? count / max : 0;
    // Green scale: low = dark muted, high = bright green
    const r = Math.round(16 + (74 - 16) * intensity);
    const g = Math.round(62 + (222 - 62) * intensity);
    const b = Math.round(62 + (128 - 62) * intensity);
    return `rgba(${r},${g},${b},${0.3 + 0.7 * intensity})`;
  }

  // ── Actions ───────────────────────────────────────────────────

  openModal(item: WatchedItem | null): void {
    const data: WatchedModalData = { item: item ?? undefined };
    this.dialog.open(WatchedModalComponent, { width: 'min(500px, calc(100vw - 16px))', data })
      .afterClosed().subscribe((result: Partial<WatchedItem> | undefined) => {
        if (!result) return;
        if (item) {
          this.data.updateWatched(item.id, result);
        } else {
          this.data.addWatched(result as Omit<WatchedItem, 'id' | 'addedDate'>);
        }
      });
  }

  setStatus(item: WatchedItem, status: WatchedItem['status']): void {
    this.data.setWatchedStatus(item.id, status);
  }

  onDelete(item: WatchedItem): void {
    const data: ConfirmDialogData = { message: `Usunąć "${item.name}"?` };
    this.dialog.open(ConfirmDialogComponent, { width: '320px', data })
      .afterClosed().subscribe(ok => { if (ok) this.data.deleteWatched(item.id); });
  }
}
