import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { DataService } from '../../core/services/data.service';
import { WatchedItem } from '../../core/models/catalog.models';
import { WatchedModalComponent, WatchedModalData } from './watched-modal/watched-modal.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/modals/confirm-dialog/confirm-dialog.component';

type FilterTab = 'all' | 'watching' | 'sold' | 'unsold';

@Component({
  selector: 'app-watched',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="watched-page">

      <!-- Fixed top: toolbar + filters + analytics -->
      <div class="w-fixed">
        <div class="w-toolbar">
          <span class="w-title">Obserwowane</span>
          <button class="add-btn" (click)="openModal(null)">
            <mat-icon>add</mat-icon> Dodaj
          </button>
        </div>

        <div class="filter-tabs">
          <button class="ftab" [class.active]="filter() === 'all'" (click)="filter.set('all')">
            Wszystkie <span class="ftab-count">{{ data.watched().length }}</span>
          </button>
          <button class="ftab" [class.active]="filter() === 'watching'" (click)="filter.set('watching')">
            Obserwuję <span class="ftab-count">{{ countBy('watching') }}</span>
          </button>
          <button class="ftab" [class.active]="filter() === 'sold'" (click)="filter.set('sold')">
            Sprzedane <span class="ftab-count">{{ countBy('sold') }}</span>
          </button>
          <button class="ftab" [class.active]="filter() === 'unsold'" (click)="filter.set('unsold')">
            Nie sprzedane <span class="ftab-count">{{ countBy('unsold') }}</span>
          </button>
        </div>

        <!-- Analytics — only when there are sold items -->
        @if (soldItems().length >= 2) {
          <div class="analytics">

            <!-- Summary -->
            <div class="summary-row">
              <div class="sum-pill">
                <div class="sum-val">{{ sellRate() }}%</div>
                <div class="sum-label">Sprzedawalność</div>
              </div>
              <div class="sum-pill">
                <div class="sum-val">{{ avgSoldPrice() | number:'1.0-0' }} zł</div>
                <div class="sum-label">Śr. cena sprzedaży</div>
              </div>
              <div class="sum-pill">
                <div class="sum-val">{{ avgPriceDrop() | number:'1.0-0' }} zł</div>
                <div class="sum-label">Śr. różnica ceny</div>
              </div>
            </div>

            <!-- Category heatmap -->
            @if (categoryStats().length > 0) {
              <div class="heat-block">
                <div class="heat-label">Co schodzi — kategorie</div>
                <div class="heat-grid">
                  @for (c of categoryStats(); track c.name) {
                    <div class="heat-cell" [style.background]="heatColor(c.soldCount, maxCatSold())"
                      [title]="c.name + ': ' + c.soldCount + '/' + c.total + ' sprzedane'">
                      <div class="hc-name">{{ c.name }}</div>
                      <div class="hc-count">{{ c.soldCount }}/{{ c.total }}</div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Size heatmap -->
            @if (sizeStats().length > 0) {
              <div class="heat-block">
                <div class="heat-label">Co schodzi — rozmiary</div>
                <div class="heat-grid">
                  @for (s of sizeStats(); track s.name) {
                    <div class="heat-cell size-cell" [style.background]="heatColor(s.soldCount, maxSizeSold())"
                      [title]="'Rozmiar ' + s.name + ': ' + s.soldCount + '/' + s.total + ' sprzedane'">
                      <div class="hc-name">{{ s.name }}</div>
                      <div class="hc-count">{{ s.soldCount }}/{{ s.total }}</div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Brand sell rate -->
            @if (brandStats().length > 0) {
              <div class="heat-block">
                <div class="heat-label">Marki — % sprzedawalności</div>
                <div class="brand-bars">
                  @for (b of brandStats(); track b.name) {
                    <div class="brand-row">
                      <div class="brand-name">{{ b.name }}</div>
                      <div class="brand-bar-wrap">
                        <div class="brand-bar" [style.width.%]="b.rate"></div>
                      </div>
                      <div class="brand-pct">{{ b.rate }}%</div>
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
            <p>{{ emptyMsg() }}</p>
            @if (filter() === 'all') {
              <p class="empty-sub">Dodaj ogłoszenia które obserwujesz, a gdy się sprzedadzą — zaznacz i wpisz cenę</p>
            }
          </div>
        } @else {
          <div class="w-list">
            @for (item of filteredItems(); track item.id) {
              <div class="w-item" [class]="'s-' + item.status">
                <div class="w-row1">
                  <div class="w-info">
                    <div class="w-name">{{ item.name }}</div>
                    <div class="w-chips">
                      @if (item.category) { <span class="chip">{{ item.category }}</span> }
                      @if (item.size) { <span class="chip">{{ item.size }}</span> }
                      @if (item.brand) { <span class="chip chip-brand">{{ item.brand }}</span> }
                      @if (item.platform) { <span class="chip chip-platform">{{ item.platform }}</span> }
                    </div>
                  </div>
                  <div class="w-price-col">
                    <div class="w-listed">{{ item.listedPrice | number:'1.2-2' }} zł</div>
                    @if (item.status === 'sold' && item.soldPrice) {
                      <div class="w-sold-price">→ {{ item.soldPrice | number:'1.2-2' }} zł</div>
                    }
                  </div>
                </div>
                <div class="w-row2">
                  <span class="status-chip s-chip-{{ item.status }}">{{ statusLabel(item.status) }}</span>
                  @if (item.link) {
                    <a class="link-btn" [href]="item.link" target="_blank" rel="noopener" title="Otwórz ogłoszenie">
                      <mat-icon>open_in_new</mat-icon>
                    </a>
                  }
                  <div class="w-actions">
                    @if (item.status === 'watching') {
                      <button class="act sold-act" (click)="markSold(item)" title="Sprzedane — wpisz cenę">
                        <mat-icon>sell</mat-icon>
                      </button>
                      <button class="act unsold-act" (click)="data.setWatchedStatus(item.id, 'unsold')" title="Nie sprzedane">
                        <mat-icon>remove_circle_outline</mat-icon>
                      </button>
                    }
                    <button class="act edit-act" (click)="openModal(item)" title="Edytuj">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button class="act del-act" (click)="onDelete(item)" title="Usuń">
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

    .w-toolbar { display: flex; align-items: center; gap: 8px; padding: 12px 16px 8px; }
    .w-title { font-size: 16px; font-weight: 700; color: var(--text); flex: 1; }
    .add-btn {
      display: inline-flex; align-items: center; gap: 4px; padding: 7px 14px;
      border-radius: 10px; border: none; background: var(--primary); color: #12121f;
      font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
    }
    .add-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .filter-tabs { display: flex; gap: 6px; padding: 0 16px 10px; overflow-x: auto; }
    .ftab {
      display: flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 8px;
      border: 1px solid var(--border); background: var(--surface-2); color: var(--text-muted);
      font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit;
      white-space: nowrap; transition: all .2s; flex-shrink: 0;
    }
    .ftab.active { border-color: var(--border-amber); color: var(--primary); background: rgba(255,193,7,.08); }
    .ftab-count { font-size: 10px; background: var(--surface-3); border-radius: 10px; padding: 1px 5px; }
    .ftab.active .ftab-count { background: rgba(255,193,7,.15); color: var(--primary); }

    /* Analytics */
    .analytics { padding: 4px 16px 12px; display: flex; flex-direction: column; gap: 10px; }
    .summary-row { display: flex; gap: 6px; }
    .sum-pill { flex: 1; background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; padding: 8px 6px; text-align: center; min-width: 0; }
    .sum-val { font-size: clamp(12px, 4vw, 19px); font-weight: 800; color: var(--primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sum-label { font-size: 9px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; margin-top: 2px; }

    .heat-block { }
    .heat-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text-muted); margin-bottom: 5px; }
    .heat-grid { display: flex; flex-wrap: wrap; gap: 5px; }
    .heat-cell {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      border-radius: 8px; padding: 5px 10px; min-width: 58px; cursor: default; transition: transform .15s;
    }
    .heat-cell:hover { transform: scale(1.06); }
    .hc-name { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.85); }
    .hc-count { font-size: 16px; font-weight: 800; color: white; line-height: 1.1; }
    .size-cell { min-width: 40px; padding: 5px 6px; }

    .brand-bars { display: flex; flex-direction: column; gap: 5px; }
    .brand-row { display: flex; align-items: center; gap: 8px; }
    .brand-name { font-size: 12px; font-weight: 600; color: var(--text); min-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .brand-bar-wrap { flex: 1; height: 7px; background: var(--surface-2); border-radius: 4px; overflow: hidden; }
    .brand-bar { height: 100%; background: #4ade80; border-radius: 4px; transition: width .4s ease; }
    .brand-pct { font-size: 11px; font-weight: 700; color: #4ade80; min-width: 36px; text-align: right; }

    /* List */
    .w-list { padding: 0 16px; }
    .w-item {
      padding: 11px 0 11px 10px; margin-left: -10px;
      border-bottom: 1px solid var(--border); border-left: 3px solid transparent;
      animation: fadeUp .25s ease both;
    }
    .w-item.s-watching { border-left-color: #38bdf8; }
    .w-item.s-sold { border-left-color: #4ade80; }
    .w-item.s-unsold { border-left-color: #f43f5e; opacity: .7; }

    .w-row1 { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 5px; }
    .w-info { flex: 1; min-width: 0; }
    .w-name { font-weight: 600; font-size: 14px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .w-chips { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px; }
    .chip { font-size: 10px; font-weight: 600; padding: 1px 7px; border-radius: 20px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-muted); }
    .chip-brand { color: #a78bfa; border-color: rgba(167,139,250,.3); background: rgba(167,139,250,.08); }
    .chip-platform { color: #38bdf8; border-color: rgba(56,189,248,.25); background: rgba(56,189,248,.08); }

    .w-price-col { text-align: right; flex-shrink: 0; }
    .w-listed { font-weight: 700; color: var(--primary); font-size: 14px; }
    .w-sold-price { font-size: 12px; color: #4ade80; font-weight: 600; }

    .w-row2 { display: flex; align-items: center; gap: 6px; }
    .status-chip { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
    .s-chip-watching { background: rgba(56,189,248,.12); color: #38bdf8; border: 1px solid rgba(56,189,248,.3); }
    .s-chip-sold { background: rgba(74,222,128,.12); color: #4ade80; border: 1px solid rgba(74,222,128,.3); }
    .s-chip-unsold { background: rgba(244,63,94,.1); color: #f43f5e; border: 1px solid rgba(244,63,94,.25); }

    .link-btn { display: flex; align-items: center; color: var(--text-muted); text-decoration: none; transition: color .2s; }
    .link-btn:hover { color: var(--primary); }
    .link-btn mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .w-actions { margin-left: auto; display: flex; gap: 2px; }
    .act { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; color: var(--text-muted); transition: color .2s, background .2s; }
    .act mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .sold-act:hover { color: #4ade80; background: rgba(74,222,128,.1); }
    .unsold-act:hover { color: #f43f5e; background: rgba(244,63,94,.1); }
    .edit-act:hover { color: #38bdf8; background: rgba(56,189,248,.1); }
    .del-act:hover { color: #f43f5e; background: rgba(244,63,94,.1); }

    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 60px 24px; color: var(--text-muted); text-align: center; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .empty-state p { margin: 0; font-size: 14px; }
    .empty-sub { font-size: 12px; color: var(--text-muted); max-width: 280px; }
  `],
})
export class WatchedComponent {
  data = inject(DataService);
  private dialog = inject(MatDialog);

  filter = signal<FilterTab>('all');

  filteredItems = computed(() => {
    const f = this.filter();
    const items = this.data.watched();
    return f === 'all' ? items : items.filter(x => x.status === f);
  });

  soldItems = computed(() => this.data.watched().filter(x => x.status === 'sold'));

  countBy(status: WatchedItem['status']): number {
    return this.data.watched().filter(x => x.status === status).length;
  }

  statusLabel(s: WatchedItem['status']): string {
    return { watching: 'Obserwuję', sold: 'Sprzedane', unsold: 'Nie sprzedane' }[s];
  }

  emptyMsg(): string {
    return { all: 'Brak obserwowanych', watching: 'Brak obserwowanych', sold: 'Brak sprzedanych', unsold: 'Brak niesprzedanych' }[this.filter()];
  }

  // ── Analytics ──────────────────────────────────────────────────

  sellRate = computed(() => {
    const total = this.data.watched().filter(x => x.status !== 'watching').length;
    if (!total) return 0;
    return Math.round((this.soldItems().length / total) * 100);
  });

  avgSoldPrice = computed(() => {
    const s = this.soldItems().filter(x => x.soldPrice);
    if (!s.length) return 0;
    return s.reduce((acc, x) => acc + x.soldPrice!, 0) / s.length;
  });

  avgPriceDrop = computed(() => {
    const s = this.soldItems().filter(x => x.soldPrice);
    if (!s.length) return 0;
    return s.reduce((acc, x) => acc + (x.listedPrice - x.soldPrice!), 0) / s.length;
  });

  categoryStats = computed(() => {
    const map = new Map<string, { soldCount: number; total: number }>();
    for (const x of this.data.watched()) {
      const key = x.category || 'Inne';
      const cur = map.get(key) ?? { soldCount: 0, total: 0 };
      cur.total++;
      if (x.status === 'sold') cur.soldCount++;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.soldCount - a.soldCount);
  });

  maxCatSold = computed(() => Math.max(...this.categoryStats().map(c => c.soldCount), 1));

  sizeStats = computed(() => {
    const map = new Map<string, { soldCount: number; total: number }>();
    for (const x of this.data.watched()) {
      if (!x.size) continue;
      const cur = map.get(x.size) ?? { soldCount: 0, total: 0 };
      cur.total++;
      if (x.status === 'sold') cur.soldCount++;
      map.set(x.size, cur);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.soldCount - a.soldCount);
  });

  maxSizeSold = computed(() => Math.max(...this.sizeStats().map(s => s.soldCount), 1));

  brandStats = computed(() => {
    const map = new Map<string, { soldCount: number; total: number }>();
    for (const x of this.data.watched()) {
      if (!x.brand) continue;
      const cur = map.get(x.brand) ?? { soldCount: 0, total: 0 };
      cur.total++;
      if (x.status === 'sold') cur.soldCount++;
      map.set(x.brand, cur);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, rate: Math.round((v.soldCount / v.total) * 100) }))
      .filter(b => b.rate > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 7);
  });

  heatColor(count: number, max: number): string {
    const t = max > 0 ? count / max : 0;
    const r = Math.round(16 + 58 * t);
    const g = Math.round(62 + 160 * t);
    const b = Math.round(62 + 66 * t);
    return `rgba(${r},${g},${b},${0.25 + 0.75 * t})`;
  }

  // ── Actions ───────────────────────────────────────────────────

  openModal(item: WatchedItem | null): void {
    const dialogData: WatchedModalData = { item: item ?? undefined };
    this.dialog.open(WatchedModalComponent, {
      width: 'min(500px, calc(100vw - 16px))', data: dialogData,
    }).afterClosed().subscribe((result: Partial<WatchedItem> | undefined) => {
      if (!result) return;
      if (item) {
        this.data.updateWatched(item.id, result);
      } else {
        this.data.addWatched(result as Omit<WatchedItem, 'id' | 'addedDate'>);
      }
    });
  }

  markSold(item: WatchedItem): void {
    // Open modal pre-set to 'sold' so user can enter sold price
    const dialogData: WatchedModalData = { item: { ...item, status: 'sold' } };
    this.dialog.open(WatchedModalComponent, {
      width: 'min(500px, calc(100vw - 16px))', data: dialogData,
    }).afterClosed().subscribe((result: Partial<WatchedItem> | undefined) => {
      if (result) this.data.updateWatched(item.id, result);
    });
  }

  onDelete(item: WatchedItem): void {
    const dialogData: ConfirmDialogData = { message: `Usunąć "${item.name}"?` };
    this.dialog.open(ConfirmDialogComponent, { width: '320px', data: dialogData })
      .afterClosed().subscribe(ok => { if (ok) this.data.deleteWatched(item.id); });
  }
}
