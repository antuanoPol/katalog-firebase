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
          <button class="back-btn" (click)="router.navigate(['/catalog'])" title="Wróć do katalogu">
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
            Wszystkie <span class="ftab-count">{{ data.products().length }}</span>
          </button>
          @for (cat of data.categories(); track cat.id) {
            <button class="ftab" [class.active]="activeCategory() === cat.id"
              (click)="activeCategory.set(cat.id)">
              {{ cat.name }} <span class="ftab-count">{{ catCount(cat.id) }}</span>
            </button>
          }
        </div>
      </div>

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
                      <div class="prod-cost">Koszt: {{ prod.price | number:'1.2-2' }} zł</div>
                    </div>
                  </div>
                  <div class="obs-field">
                    <label class="obs-label">Cena rynkowa (zł)</label>
                    <input class="obs-input" type="number" min="0" step="0.01"
                      placeholder="0.00"
                      [value]="getPrice(prod.id)"
                      (change)="onPriceChange(prod.id, $any($event.target).value)" />
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
                  <div class="prod-cost">Koszt: {{ prod.price | number:'1.2-2' }} zł</div>
                </div>
              </div>
              <div class="obs-field">
                <label class="obs-label">Cena rynkowa (zł)</label>
                <input class="obs-input" type="number" min="0" step="0.01"
                  placeholder="0.00"
                  [value]="getPrice(prod.id)"
                  (change)="onPriceChange(prod.id, $any($event.target).value)" />
              </div>
            </div>
          }
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

    /* Product list */
    .cat-section { }
    .cat-header {
      padding: 7px 16px; font-size: 11px; font-weight: 700;
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
    .prod-thumb { width: 38px; height: 38px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
    .prod-text { min-width: 0; flex: 1; }
    .prod-name { font-weight: 600; font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .prod-cost { font-size: 11px; color: var(--text-muted); margin-top: 1px; }

    .obs-field { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
    .obs-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); white-space: nowrap; }
    .obs-input {
      width: 90px; text-align: right;
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 8px; padding: 6px 8px; color: var(--text);
      font-size: 13px; font-weight: 700; font-family: inherit;
      outline: none; transition: border-color .2s;
    }
    .obs-input:focus { border-color: var(--border-amber); }

    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 60px 24px; color: var(--text-muted); text-align: center; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .empty-state p { margin: 0; font-size: 14px; }

    @media (max-width: 767px) {
      .w-toolbar { padding: 8px 12px 6px; gap: 6px; }
      .w-title { font-size: 14px; }
      .filter-tabs { padding: 0 12px 8px; gap: 5px; }
      .prod-row { padding: 9px 12px; gap: 8px; }
      .obs-input { width: 72px; font-size: 12px; padding: 5px 6px; }
      .obs-label { display: none; }
    }
  `],
})
export class WatchedComponent {
  data = inject(DataService);
  router = inject(Router);

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

  catCount(catId: string): number {
    return this.data.products().filter(p => p.catId === catId).length;
  }

  getPrice(productId: string): string {
    const v = this.data.observedPrices()[productId];
    return v > 0 ? String(v) : '';
  }

  onPriceChange(productId: string, value: string): void {
    const num = parseFloat(value);
    this.data.setObservedPrice(productId, isNaN(num) || num < 0 ? 0 : num);
  }
}
