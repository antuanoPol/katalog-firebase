import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-watched',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="watched-page">

      <!-- Fixed top: toolbar + filters + analytics -->
      <div class="w-fixed">

        <div class="w-toolbar">
          <span class="w-title">Obserwowane ceny</span>
          <div class="search-box">
            <mat-icon class="search-icon">search</mat-icon>
            <input class="search-input" [value]="searchQuery()"
              (input)="searchQuery.set($any($event.target).value)"
              placeholder="Szukaj produktu..." />
            @if (searchQuery()) {
              <button class="search-clear" (click)="searchQuery.set('')">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>
        </div>

        <div class="filter-tabs">
          <button class="ftab" [class.active]="activeCategory() === 'all'"
            (click)="activeCategory.set('all')">
            Wszystkie <span class="ftab-count">{{ data.products().length }}</span>
          </button>
          @for (cat of data.categories(); track cat.id) {
            <button class="ftab" [class.active]="activeCategory() === cat.id"
              (click)="activeCategory.set(cat.id)">
              {{ cat.name }} <span class="ftab-count">{{ catCount(cat.id) }}</span>
            </button>
          }
        </div>

        @if (observedList().length >= 2) {
          <div class="analytics">
            <div class="sum-row">
              <div class="sum-pill">
                <div class="sum-val">{{ observedList().length }}</div>
                <div class="sum-label">Obserwowanych</div>
              </div>
              <div class="sum-pill">
                <div class="sum-val">{{ avgObserved() | number:'1.0-0' }} zł</div>
                <div class="sum-label">Śr. cena rynkowa</div>
              </div>
            </div>

            @if (catAvgHeatmap().length > 0) {
              <div class="heat-block">
                <div class="heat-label">Śr. cena rynkowa — kategorie</div>
                <div class="heat-grid">
                  @for (c of catAvgHeatmap(); track c.name) {
                    <div class="heat-cell"
                      [style.background]="heatColor(c.avg, maxCatAvg())"
                      [title]="c.name + ': śr. ' + c.avg + ' zł (' + c.count + ' szt.)'">
                      <div class="hc-name">{{ c.name }}</div>
                      <div class="hc-val">{{ c.avg | number:'1.0-0' }} zł</div>
                      <div class="hc-small">{{ c.count }} szt.</div>
                    </div>
                  }
                </div>
              </div>
            }

            @if (catProfitHeatmap().length > 0) {
              <div class="heat-block">
                <div class="heat-label">Potencjalny zysk — kategorie</div>
                <div class="heat-grid">
                  @for (c of catProfitHeatmap(); track c.name) {
                    <div class="heat-cell"
                      [style.background]="heatColor(c.profit, maxCatProfit())"
                      [title]="c.name + ': śr. zysk ' + c.profit + ' zł'">
                      <div class="hc-name">{{ c.name }}</div>
                      <div class="hc-val">+{{ c.profit | number:'1.0-0' }} zł</div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }

      </div><!-- /w-fixed -->

      <!-- Scrollable product list -->
      <div class="w-scroll">
        @if (data.products().length === 0) {
          <div class="empty-state">
            <mat-icon>inventory_2</mat-icon>
            <p>Brak produktów w katalogu</p>
          </div>
        } @else if (activeCategory() === 'all') {
          @for (group of groupedProducts(); track group.cat.id) {
            <div class="cat-section">
              <div class="cat-header">{{ group.cat.name }}</div>
              @for (prod of group.prods; track prod.id) {
                <div class="prod-row">
                  <div class="prod-info">
                    @if (prod.img) { <img class="prod-thumb" [src]="prod.img" /> }
                    <div class="prod-text">
                      <div class="prod-name">{{ prod.name }}</div>
                      <div class="prod-cost">Koszt zakupu: {{ prod.price | number:'1.2-2' }} zł</div>
                    </div>
                  </div>
                  <div class="obs-field">
                    <label class="obs-label">Cena rynkowa (zł)</label>
                    <input class="obs-input" type="number" min="0" step="0.01"
                      placeholder="0.00"
                      [value]="getPrice(prod.id)"
                      (change)="onPriceChange(prod.id, $any($event.target).value)" />
                    @if (getProfit(prod.id) !== null) {
                      <div class="profit-badge" [class.neg]="getProfit(prod.id)! < 0">
                        {{ getProfit(prod.id)! >= 0 ? '+' : '' }}{{ getProfit(prod.id)! | number:'1.0-0' }} zł
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        } @else {
          @for (prod of filteredProducts(); track prod.id) {
            <div class="prod-row">
              <div class="prod-info">
                @if (prod.img) { <img class="prod-thumb" [src]="prod.img" /> }
                <div class="prod-text">
                  <div class="prod-name">{{ prod.name }}</div>
                  <div class="prod-cost">Koszt zakupu: {{ prod.price | number:'1.2-2' }} zł</div>
                </div>
              </div>
              <div class="obs-field">
                <label class="obs-label">Cena rynkowa (zł)</label>
                <input class="obs-input" type="number" min="0" step="0.01"
                  placeholder="0.00"
                  [value]="getPrice(prod.id)"
                  (change)="onPriceChange(prod.id, $any($event.target).value)" />
                @if (getProfit(prod.id) !== null) {
                  <div class="profit-badge" [class.neg]="getProfit(prod.id)! < 0">
                    {{ getProfit(prod.id)! >= 0 ? '+' : '' }}{{ getProfit(prod.id)! | number:'1.0-0' }} zł
                  </div>
                }
              </div>
            </div>
          }
        }
      </div><!-- /w-scroll -->

    </div>
  `,
  styles: [`
    .watched-page { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
    .w-fixed { flex-shrink: 0; background: var(--surface); border-bottom: 1px solid var(--border); }
    .w-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y; padding-bottom: 80px; }

    /* Toolbar */
    .w-toolbar { display: flex; align-items: center; gap: 8px; padding: 10px 16px 8px; }
    .w-title { font-size: 16px; font-weight: 700; color: var(--text); flex-shrink: 0; }
    .search-box {
      display: flex; align-items: center; gap: 6px;
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 10px; padding: 0 10px; height: 36px;
      flex: 1; min-width: 120px; max-width: 280px; transition: border-color .2s;
    }
    .search-box:focus-within { border-color: var(--border-amber); }
    .search-icon { font-size: 16px; width: 16px; height: 16px; color: var(--text-muted); }
    .search-input { flex: 1; background: none; border: none; outline: none; color: var(--text); font-size: 13px; font-family: inherit; }
    .search-clear { background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; color: var(--text-muted); }
    .search-clear mat-icon { font-size: 14px; width: 14px; height: 14px; }

    /* Filter tabs */
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
    .sum-row { display: flex; gap: 6px; }
    .sum-pill {
      flex: 1; background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 10px; padding: 8px 6px; text-align: center; min-width: 0;
    }
    .sum-val { font-size: clamp(13px, 4vw, 20px); font-weight: 800; color: var(--primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sum-label { font-size: 9px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; margin-top: 2px; }

    .heat-block { }
    .heat-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text-muted); margin-bottom: 5px; }
    .heat-grid { display: flex; flex-wrap: wrap; gap: 5px; }
    .heat-cell {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      border-radius: 8px; padding: 5px 10px; min-width: 70px; cursor: default;
      transition: transform .15s;
    }
    .heat-cell:hover { transform: scale(1.06); }
    .hc-name { font-size: 9px; font-weight: 700; color: rgba(255,255,255,.8); text-align: center; }
    .hc-val { font-size: 14px; font-weight: 800; color: white; line-height: 1.2; }
    .hc-small { font-size: 9px; color: rgba(255,255,255,.7); }

    /* Product list */
    .cat-section { }
    .cat-header {
      padding: 8px 16px 4px; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .08em;
      color: var(--text-muted); background: var(--surface);
      border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 1;
    }
    .prod-row {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 16px; border-bottom: 1px solid var(--border);
    }
    .prod-info { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
    .prod-thumb { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
    .prod-text { min-width: 0; }
    .prod-name { font-weight: 600; font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .prod-cost { font-size: 11px; color: var(--text-muted); margin-top: 1px; }

    .obs-field { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
    .obs-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
    .obs-input {
      width: 90px; text-align: right;
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 8px; padding: 6px 8px; color: var(--text);
      font-size: 13px; font-weight: 700; font-family: inherit;
      outline: none; transition: border-color .2s;
    }
    .obs-input:focus { border-color: var(--border-amber); }
    .profit-badge {
      font-size: 11px; font-weight: 700; color: #4ade80;
      background: rgba(74,222,128,.1); border-radius: 6px;
      padding: 1px 6px;
    }
    .profit-badge.neg { color: #f43f5e; background: rgba(244,63,94,.1); }

    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 60px 24px; color: var(--text-muted); text-align: center; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .empty-state p { margin: 0; font-size: 14px; }

    @media (max-width: 767px) {
      .search-box { flex: 1; max-width: 100%; }
      .obs-input { width: 75px; }
    }
  `],
})
export class WatchedComponent {
  data = inject(DataService);

  searchQuery = signal('');
  activeCategory = signal('all');

  filteredProducts = computed(() => {
    const catId = this.activeCategory();
    const q = this.searchQuery().toLowerCase();
    let prods = catId === 'all'
      ? this.data.products()
      : this.data.products().filter(p => p.catId === catId);
    if (q) prods = prods.filter(p => p.name.toLowerCase().includes(q));
    return prods;
  });

  groupedProducts = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.data.categories().map(cat => ({
      cat,
      prods: this.data.products()
        .filter(p => p.catId === cat.id)
        .filter(p => !q || p.name.toLowerCase().includes(q)),
    })).filter(g => g.prods.length > 0);
  });

  observedList = computed(() => {
    const prices = this.data.observedPrices();
    return this.data.products().filter(p => (prices[p.id] ?? 0) > 0);
  });

  avgObserved = computed(() => {
    const items = this.observedList();
    const prices = this.data.observedPrices();
    if (!items.length) return 0;
    return items.reduce((s, p) => s + prices[p.id], 0) / items.length;
  });

  catAvgHeatmap = computed(() => {
    const prices = this.data.observedPrices();
    return this.data.categories().map(cat => {
      const prods = this.data.products().filter(p => p.catId === cat.id && (prices[p.id] ?? 0) > 0);
      if (!prods.length) return null;
      const avg = prods.reduce((s, p) => s + prices[p.id], 0) / prods.length;
      return { name: cat.name, avg: Math.round(avg), count: prods.length };
    }).filter(Boolean) as { name: string; avg: number; count: number }[];
  });

  maxCatAvg = computed(() => Math.max(...this.catAvgHeatmap().map(c => c.avg), 1));

  catProfitHeatmap = computed(() => {
    const prices = this.data.observedPrices();
    return this.data.categories().map(cat => {
      const prods = this.data.products().filter(p => p.catId === cat.id && (prices[p.id] ?? 0) > 0);
      if (!prods.length) return null;
      const avgProfit = prods.reduce((s, p) => s + (prices[p.id] - p.price), 0) / prods.length;
      if (avgProfit <= 0) return null;
      return { name: cat.name, profit: Math.round(avgProfit) };
    }).filter(Boolean) as { name: string; profit: number }[];
  });

  maxCatProfit = computed(() => Math.max(...this.catProfitHeatmap().map(c => c.profit), 1));

  catCount(catId: string): number {
    return this.data.products().filter(p => p.catId === catId).length;
  }

  getPrice(productId: string): string {
    const v = this.data.observedPrices()[productId];
    return v > 0 ? String(v) : '';
  }

  getProfit(productId: string): number | null {
    const observed = this.data.observedPrices()[productId];
    if (!observed || observed <= 0) return null;
    const prod = this.data.products().find(p => p.id === productId);
    if (!prod) return null;
    return Math.round((observed - prod.price) * 100) / 100;
  }

  onPriceChange(productId: string, value: string): void {
    const num = parseFloat(value);
    this.data.setObservedPrice(productId, isNaN(num) || num < 0 ? 0 : num);
  }

  heatColor(value: number, max: number): string {
    const t = max > 0 ? Math.min(value, max) / max : 0;
    const r = Math.round(16 + 58 * t);
    const g = Math.round(62 + 160 * t);
    const b = Math.round(62 + 66 * t);
    return `rgba(${r},${g},${b},${0.25 + 0.75 * t})`;
  }
}
