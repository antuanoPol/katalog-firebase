import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-watched',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="watched-page">

      <!-- Fixed top -->
      <div class="w-fixed">
        <div class="w-toolbar">
          <button class="back-btn" (click)="router.navigate(['/catalog'])">
            <mat-icon>arrow_back</mat-icon>
          </button>
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
            Wszystkie <span class="ftab-count">{{ watchedCount() }}</span>
          </button>
          @for (cat of data.categories(); track cat.id) {
            @if (catWatchedCount(cat.id) > 0) {
              <button class="ftab" [class.active]="activeCategory() === cat.id"
                (click)="activeCategory.set(cat.id)">
                {{ cat.name }} <span class="ftab-count">{{ catWatchedCount(cat.id) }}</span>
              </button>
            }
          }
        </div>
      </div>

      <!-- Scrollable list -->
      <div class="w-scroll">
        @if (data.products().length === 0) {
          <div class="empty-state">
            <mat-icon>inventory_2</mat-icon>
            <p>Brak produktów w katalogu</p>
          </div>
        }
        @for (group of displayGroups(); track group.cat.id) {
          <div class="cat-section">
            <div class="cat-header">{{ group.cat.name }}</div>
            @for (prod of group.prods; track prod.id) {
              <div class="prod-card" [class.open]="expandedId() === prod.id">

                <!-- Collapsed row — click to expand -->
                <div class="prod-row" (click)="toggleExpand(prod.id)">
                  <div class="prod-info">
                    @if (prod.img) { <img class="prod-thumb" [src]="prod.img" /> }
                    <div class="prod-text">
                      <div class="prod-name">{{ prod.name }}</div>
                      <div class="prod-cost">Koszt: {{ prod.price | number:'1.2-2' }} zł</div>
                    </div>
                  </div>
                  <div class="prod-right">
                    @if (getPrices(prod.id).length > 0) {
                      <div class="avg-summary">
                        <span class="avg-val">{{ getAvg(prod.id) | number:'1.0-0' }} zł</span>
                        <span class="price-count">{{ getPrices(prod.id).length }}×</span>
                      </div>
                    } @else {
                      <span class="no-price">brak cen</span>
                    }
                    <mat-icon class="chevron" [class.rotated]="expandedId() === prod.id">
                      expand_more
                    </mat-icon>
                    <button class="unwatch-btn" (click)="$event.stopPropagation(); unwatch(prod.id)" title="Usuń z obserwowanych">
                      <mat-icon>visibility_off</mat-icon>
                    </button>
                  </div>
                </div>

                <!-- Expanded panel -->
                @if (expandedId() === prod.id) {
                  <div class="price-panel" (click)="$event.stopPropagation()">

                    @if (getPrices(prod.id).length > 0) {
                      <div class="prices-list">
                        @for (price of getPrices(prod.id); track i; let i = $index) {
                          <div class="price-item">
                            <span class="price-num">{{ i + 1 }}.</span>
                            <span class="price-val">{{ price | number:'1.2-2' }} zł</span>
                            <button class="del-price" (click)="data.removeObservedPrice(prod.id, i)">
                              <mat-icon>close</mat-icon>
                            </button>
                          </div>
                        }
                      </div>
                      <div class="avg-row">
                        Średnia z {{ getPrices(prod.id).length }} cen:
                        <strong>{{ getAvg(prod.id) | number:'1.2-2' }} zł</strong>
                      </div>
                    }

                    <div class="add-row">
                      <input class="add-input" type="number" min="0" step="0.01"
                        placeholder="Wpisz cenę..."
                        [value]="newPrice()"
                        (input)="newPrice.set($any($event.target).value)"
                        (keydown.enter)="addPrice(prod.id)" />
                      <button class="add-btn" (click)="addPrice(prod.id)"
                        [disabled]="!newPrice() || +newPrice() <= 0">
                        <mat-icon>add</mat-icon> Dodaj
                      </button>
                    </div>

                  </div>
                }

              </div>
            }
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .watched-page { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
    .w-fixed { flex-shrink: 0; background: var(--surface); border-bottom: 1px solid var(--border); }
    .w-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y; padding-bottom: 16px; }

    /* Toolbar */
    .w-toolbar { display: flex; align-items: center; gap: 8px; padding: 10px 16px 8px; }
    .back-btn {
      display: flex; align-items: center; justify-content: center;
      width: 34px; height: 34px; flex-shrink: 0;
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 10px; cursor: pointer; color: var(--text-muted);
      transition: color .2s, border-color .2s;
    }
    .back-btn:hover { color: var(--primary); border-color: var(--border-amber); }
    .back-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .w-title { font-size: 15px; font-weight: 700; color: var(--text); flex-shrink: 0; white-space: nowrap; }
    .search-box {
      display: flex; align-items: center; gap: 6px;
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 10px; padding: 0 10px; height: 36px;
      flex: 1; min-width: 0; transition: border-color .2s;
    }
    .search-box:focus-within { border-color: var(--border-amber); }
    .search-icon { font-size: 16px; width: 16px; height: 16px; color: var(--text-muted); flex-shrink: 0; }
    .search-input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--text); font-size: 13px; font-family: inherit; }
    .search-clear { background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; color: var(--text-muted); flex-shrink: 0; }
    .search-clear mat-icon { font-size: 14px; width: 14px; height: 14px; }

    /* Filter tabs */
    .filter-tabs { display: flex; gap: 6px; padding: 0 16px 10px; overflow-x: auto; scrollbar-width: none; }
    .filter-tabs::-webkit-scrollbar { display: none; }
    .ftab {
      display: flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 8px;
      border: 1px solid var(--border); background: var(--surface-2); color: var(--text-muted);
      font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit;
      white-space: nowrap; transition: all .2s; flex-shrink: 0;
    }
    .ftab.active { border-color: var(--border-amber); color: var(--primary); background: rgba(255,193,7,.08); }
    .ftab-count { font-size: 10px; background: var(--surface-3); border-radius: 10px; padding: 1px 5px; }
    .ftab.active .ftab-count { background: rgba(255,193,7,.15); color: var(--primary); }

    /* Category header */
    .cat-header {
      padding: 7px 16px; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .08em;
      color: var(--text-muted); background: var(--surface);
      border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 1;
    }

    /* Product card */
    .prod-card { border-bottom: 1px solid var(--border); }
    .prod-card.open { background: var(--surface-2); }

    .prod-row {
      display: flex; align-items: center; gap: 10px;
      padding: 11px 16px; cursor: pointer;
      transition: background .15s;
    }
    .prod-row:hover { background: rgba(255,255,255,.03); }

    .prod-info { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
    .prod-thumb { width: 38px; height: 38px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
    .prod-text { min-width: 0; flex: 1; }
    .prod-name { font-weight: 600; font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .prod-cost { font-size: 11px; color: var(--text-muted); margin-top: 1px; }

    .prod-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .avg-summary { display: flex; align-items: center; gap: 5px; }
    .avg-val { font-weight: 700; font-size: 14px; color: var(--primary); }
    .price-count { font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 8px; background: rgba(255,193,7,.12); color: var(--primary); border: 1px solid rgba(255,193,7,.25); }
    .no-price { font-size: 11px; color: var(--text-muted); }
    .chevron { color: var(--text-muted); transition: transform .2s; font-size: 20px; width: 20px; height: 20px; }
    .chevron.rotated { transform: rotate(180deg); }
    .unwatch-btn {
      background: none; border: none; cursor: pointer; padding: 4px; border-radius: 6px;
      display: flex; align-items: center; color: var(--text-muted);
      opacity: 0; transition: opacity .15s, color .15s;
    }
    .unwatch-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .unwatch-btn:hover { color: #f43f5e; }
    .prod-row:hover .unwatch-btn { opacity: 1; }
    @media (max-width: 767px) { .unwatch-btn { opacity: 1; } }

    /* Expanded price panel */
    .price-panel {
      padding: 0 16px 14px; border-top: 1px solid var(--border);
    }

    .prices-list { display: flex; flex-direction: column; gap: 4px; padding: 10px 0 6px; }
    .price-item { display: flex; align-items: center; gap: 8px; }
    .price-num { font-size: 11px; color: var(--text-muted); min-width: 16px; }
    .price-val { font-size: 14px; font-weight: 600; color: var(--text); flex: 1; }
    .del-price {
      background: none; border: none; cursor: pointer; padding: 2px; border-radius: 4px;
      display: flex; align-items: center; color: var(--text-muted); transition: color .15s;
    }
    .del-price:hover { color: #f43f5e; }
    .del-price mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .avg-row {
      font-size: 12px; color: var(--text-muted); padding: 6px 0 10px;
      border-top: 1px solid var(--border);
    }
    .avg-row strong { color: #4ade80; font-size: 15px; }

    .add-row { display: flex; gap: 8px; align-items: center; }
    .add-input {
      flex: 1; min-width: 0;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 8px; padding: 8px 10px; color: var(--text);
      font-size: 13px; font-family: inherit; outline: none; transition: border-color .2s;
    }
    .add-input:focus { border-color: var(--border-amber); }
    .add-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 8px 14px; border-radius: 8px; border: none;
      background: var(--primary); color: #12121f;
      font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
      white-space: nowrap; transition: opacity .15s;
    }
    .add-btn mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .add-btn:disabled { opacity: .4; cursor: not-allowed; }

    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 60px 24px; color: var(--text-muted); text-align: center; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .empty-state p { margin: 0; font-size: 14px; }

    @media (max-width: 767px) {
      .w-toolbar { padding: 8px 12px 6px; }
      .w-title { font-size: 13px; }
      .filter-tabs { padding: 0 12px 8px; }
      .prod-row { padding: 10px 12px; }
      .price-panel { padding: 0 12px 12px; }
      .avg-val { font-size: 13px; }
    }
  `],
})
export class WatchedComponent {
  data = inject(DataService);
  router = inject(Router);

  searchQuery = signal('');
  activeCategory = signal('all');
  expandedId = signal<string | null>(null);
  newPrice = signal('');

  displayGroups = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const catId = this.activeCategory();
    return this.data.categories()
      .filter(cat => catId === 'all' || cat.id === catId)
      .map(cat => ({
        cat,
        prods: this.data.products()
          .filter(p => p.catId === cat.id && p.watched)
          .filter(p => !q || p.name.toLowerCase().includes(q)),
      }))
      .filter(g => g.prods.length > 0);
  });

  watchedCount = computed(() => this.data.products().filter(p => p.watched).length);

  catWatchedCount(catId: string): number {
    return this.data.products().filter(p => p.catId === catId && p.watched).length;
  }

  getPrices(productId: string): number[] {
    return this.data.observedPrices()[productId] ?? [];
  }

  getAvg(productId: string): number {
    const prices = this.getPrices(productId);
    if (!prices.length) return 0;
    return Math.round((prices.reduce((s, p) => s + p, 0) / prices.length) * 100) / 100;
  }

  toggleExpand(productId: string): void {
    if (this.expandedId() === productId) {
      this.expandedId.set(null);
    } else {
      this.expandedId.set(productId);
      this.newPrice.set('');
    }
  }

  unwatch(productId: string): void {
    this.data.updateProduct(productId, { watched: false });
    if (this.expandedId() === productId) this.expandedId.set(null);
  }

  addPrice(productId: string): void {
    const num = parseFloat(this.newPrice());
    if (isNaN(num) || num <= 0) return;
    this.data.addObservedPrice(productId, num);
    this.newPrice.set('');
  }
}
