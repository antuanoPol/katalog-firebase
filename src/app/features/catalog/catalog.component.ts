import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import { CategoryGroupComponent } from './category-group/category-group.component';
import { ProductItemComponent } from './product-item/product-item.component';
import { CategoryModalComponent } from '../../shared/modals/category-modal/category-modal.component';
import { ProductModalComponent, ProductModalData } from '../../shared/modals/product-modal/product-modal.component';
import { OrderModalComponent, OrderModalData } from '../../shared/modals/order-modal/order-modal.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/modals/confirm-dialog/confirm-dialog.component';
import { ProductDetailComponent } from '../../shared/modals/product-detail/product-detail.component';
import { Product } from '../../core/models/catalog.models';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, CategoryGroupComponent, ProductItemComponent],
  template: `
    <!-- Toolbar -->
    <div class="catalog-toolbar">
      @if (!selectMode()) {
        <button class="tool-btn primary" (click)="openProductModal(null, '')">
          <mat-icon>add</mat-icon> Produkt
        </button>
        <button class="tool-btn ghost" (click)="openCategoryModal()">
          <mat-icon>create_new_folder</mat-icon> Kategoria
        </button>
        @if (data.products().length > 0) {
          <button class="tool-btn amber" (click)="startSelect()">
            <mat-icon>check_box</mat-icon> Do paczki
          </button>
        }
        <!-- Desktop only: watched button next to Do paczki -->
        <button class="tool-btn watched-btn desktop-watched" (click)="router.navigate(['/watched'])">
          <mat-icon>visibility</mat-icon> Obserwowane
        </button>
        <!-- Search + Sort (right-aligned group) -->
        <div class="toolbar-right">
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
          <div class="sort-row">
            <div class="sort-group">
              <button class="sort-btn" [class.active]="sortField() === 'name'" (click)="setSort('name')">
                Nazwa {{ sortField() === 'name' ? (sortDir() === 'asc' ? '↑' : '↓') : '' }}
              </button>
              <button class="sort-btn" [class.active]="sortField() === 'price'" (click)="setSort('price')">
                Cena {{ sortField() === 'price' ? (sortDir() === 'asc' ? '↑' : '↓') : '' }}
              </button>
              <button class="sort-btn" [class.active]="sortField() === 'mass'" (click)="setSort('mass')">
                Masa {{ sortField() === 'mass' ? (sortDir() === 'asc' ? '↑' : '↓') : '' }}
              </button>
            </div>
            <!-- Mobile only: watched icon in sort row -->
            <button class="tool-btn watched-btn mobile-watched" (click)="router.navigate(['/watched'])">
              <mat-icon>visibility</mat-icon>
            </button>
            @if (data.products().length > 0) {
              <span class="prod-count-chip">{{ data.products().length }} szt.</span>
            }
          </div>
        </div>
      } @else {
        <div class="select-toolbar">
          <span class="select-badge">{{ selectedIds().size }} zaznaczone</span>
          <button class="tool-btn ghost cancel-btn" (click)="cancelSelect()">
            <mat-icon>close</mat-icon> Anuluj
          </button>
          <button class="tool-btn primary order-btn" (click)="openOrderModal()"
            [disabled]="selectedIds().size === 0">
            <mat-icon>local_shipping</mat-icon> Utwórz zamówienie
          </button>
        </div>
      }
    </div>

    <!-- Empty state -->
    @if (data.categories().length === 0) {
      <div class="empty-state">
        <div class="empty-icon-wrap">
          <mat-icon>inventory_2</mat-icon>
        </div>
        <p class="empty-title">Brak kategorii</p>
        <p class="empty-sub">Dodaj kategorię aby zacząć budować katalog</p>
        <button class="tool-btn primary" (click)="openCategoryModal()">
          <mat-icon>add</mat-icon> Nowa kategoria
        </button>
      </div>
    }

    <!-- Category groups -->
    @for (cat of data.categories(); track cat.id; let i = $index) {
      <app-category-group
        [category]="cat"
        [products]="productsForCat(cat.id)"
        [colorIndex]="i"
        [selectMode]="selectMode()"
        [selectedIds]="selectedIds()"
        [forceExpand]="!!searchQuery()"
        (toggleCollapse)="data.toggleCategoryCollapse($event)"
        (addProduct)="openProductModal(null, $event)"
        (editProduct)="openProductModal($event, $event.catId)"
        (deleteProduct)="onDeleteProduct($event)"
        (duplicateProduct)="data.duplicateProduct($event.id)"
        (viewProduct)="openProductDetail($event)"
        (deleteCategory)="data.deleteCategory($event)"
        (toggleSelect)="toggleSelect($event)"
        (openLightbox)="lightboxSrc.set($event); showLightbox.set(true)"
      />
    }

    <!-- Uncategorized products — displayed individually without a group header -->
    @if (uncategorizedProducts().length > 0) {
      <div class="uncat-divider">
        <span class="uncat-label">Bez kategorii · {{ uncategorizedProducts().length }}</span>
      </div>
    }
    @for (product of uncategorizedProducts(); track product.id) {
      <app-product-item
        [product]="product"
        [selectMode]="selectMode()"
        [selected]="selectedIds().has(product.id)"
        (view)="openProductDetail($event)"
        (edit)="openProductModal($event, $event.catId)"
        (delete)="onDeleteProduct($event)"
        (duplicate)="data.duplicateProduct($event.id)"
        (toggleSelect)="toggleSelect($event)"
        (openLightbox)="lightboxSrc.set($event); showLightbox.set(true)"
      />
    }

    <!-- Lightbox -->
    @if (showLightbox()) {
      <div class="lightbox" (click)="showLightbox.set(false)">
        <img [src]="lightboxSrc()" />
      </div>
    }
  `,
  styles: [`
    .catalog-toolbar {
      display: flex; align-items: center; gap: 8px; padding: 10px 12px; flex-wrap: wrap;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 9;
    }
    .tool-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 10px; border: none;
      font-size: 13px; font-weight: 600; cursor: pointer;
      font-family: inherit; transition: all .2s; letter-spacing: .02em;
    }
    .tool-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .tool-btn.primary {
      background: var(--primary); color: #12121f;
      box-shadow: 0 0 16px rgba(255,193,7,.3);
    }
    .tool-btn.primary:hover { box-shadow: 0 0 28px rgba(255,193,7,.5); transform: translateY(-1px); }
    .tool-btn.primary:disabled { opacity: .4; transform: none; box-shadow: none; cursor: not-allowed; }
    .tool-btn.ghost {
      background: var(--surface-2); color: var(--text);
      border: 1px solid var(--border);
    }
    .tool-btn.ghost:hover { border-color: var(--border-amber); color: var(--primary); }
    .tool-btn.amber {
      background: rgba(255,193,7,.1); color: var(--primary);
      border: 1px solid var(--border-amber);
    }
    .tool-btn.amber:hover { background: rgba(255,193,7,.18); }
    .tool-btn.watched-btn {
      background: rgba(56,189,248,.08); color: #38bdf8;
      border: 1px solid rgba(56,189,248,.3);
    }
    .tool-btn.watched-btn:hover { background: rgba(56,189,248,.16); }
    .toolbar-right {
      display: flex; align-items: center; gap: 6px; flex: 1;
      justify-content: flex-end; flex-wrap: wrap;
    }
    .sort-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .desktop-watched { display: none; }
    .mobile-watched { display: inline-flex; }
    @media (min-width: 768px) {
      .desktop-watched { display: inline-flex; }
      .mobile-watched { display: none; }
    }
    @media (max-width: 767px) {
      .catalog-toolbar { padding: 8px 10px; gap: 6px; }
      .tool-btn { padding: 7px 12px; font-size: 12px; }
      .tool-btn.watched-btn { padding: 7px 9px; }
      .toolbar-right { flex-basis: 100%; flex-direction: column; align-items: stretch; gap: 6px; }
      .search-box { max-width: 100%; min-width: 0; height: 42px; }
      .sort-row { justify-content: flex-start; }
    }
    .prod-count-chip {
      font-size: 11px; font-weight: 700;
      color: #10b981;
      background: rgba(16,185,129,.12); border: 1px solid rgba(16,185,129,.35);
      padding: 4px 10px; border-radius: 20px; letter-spacing: .04em;
      white-space: nowrap; margin-left: auto;
    }
    .uncat-divider {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 16px; border-top: 1px solid var(--border);
    }
    .uncat-divider::before, .uncat-divider::after {
      content: ''; flex: 1; height: 1px; background: var(--border);
    }
    .uncat-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .1em; color: var(--text-muted);
      white-space: nowrap;
    }
    .select-toolbar { display: flex; align-items: center; gap: 8px; flex: 1; flex-wrap: wrap; }
    .select-badge {
      font-weight: 700; color: var(--primary); font-size: 13px; letter-spacing: .04em;
      background: var(--primary-glow); border: 1px solid var(--border-amber);
      padding: 4px 12px; border-radius: 20px; flex-shrink: 0;
    }
    .cancel-btn { margin-left: auto; flex-shrink: 0; }
    .order-btn { justify-content: center; }
    @media (max-width: 767px) {
      .order-btn { flex: 1 0 100%; }
    }
    .search-box {
      display: flex; align-items: center; gap: 6px;
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 10px; padding: 0 10px; height: 36px;
      flex: 1; min-width: 160px; max-width: 280px;
      transition: border-color .2s;
    }
    .search-box:focus-within { border-color: var(--border-amber); }
    .search-icon { font-size: 16px; width: 16px; height: 16px; color: var(--text-muted); }
    .search-input {
      flex: 1; background: none; border: none; outline: none;
      color: var(--text); font-size: 13px; font-family: inherit;
    }
    .search-clear {
      background: none; border: none; cursor: pointer; padding: 0;
      display: flex; align-items: center; color: var(--text-muted);
    }
    .search-clear mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .sort-group { display: flex; gap: 4px; }
    .sort-btn {
      padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border);
      background: var(--surface-2); color: var(--text-muted);
      font-size: 11px; font-weight: 600; cursor: pointer;
      font-family: inherit; transition: all .2s; letter-spacing: .02em;
    }
    .sort-btn.active { border-color: var(--border-amber); color: var(--primary); background: rgba(255,193,7,.08); }
    .sort-btn:hover { border-color: var(--border-amber); color: var(--primary); }
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 80px 24px; gap: 8px;
      animation: fadeIn .5s ease;
    }
    .empty-icon-wrap {
      width: 80px; height: 80px; border-radius: 24px;
      background: var(--surface-2); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center; margin-bottom: 8px;
    }
    .empty-icon-wrap mat-icon { font-size: 36px; width: 36px; height: 36px; color: var(--text-muted); }
    .empty-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--text); }
    .empty-sub { margin: 0 0 16px; font-size: 13px; color: var(--text-muted); text-align: center; }
    .lightbox {
      position: fixed; inset: 0; background: rgba(0,0,0,.93);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999; cursor: zoom-out; animation: fadeIn .2s ease;
    }
    .lightbox img {
      max-width: 95vw; max-height: 95vh; object-fit: contain;
      border-radius: var(--radius); box-shadow: 0 0 60px rgba(255,193,7,.2);
      animation: fadeUp .3s ease;
    }
  `],
})
export class CatalogComponent {
  data = inject(DataService);
  private dialog = inject(MatDialog);
  private notify = inject(NotificationService);
  router = inject(Router);

  observedCount = computed(() => Object.values(this.data.observedPrices()).filter(v => v.length > 0).length);

  selectMode = signal(false);
  selectedIds = signal<Set<string>>(new Set());
  lightboxSrc = signal('');
  showLightbox = signal(false);

  searchQuery = signal('');
  sortField = signal<'name' | 'price' | 'mass'>('name');
  sortDir = signal<'asc' | 'desc'>('asc');

  setSort(field: 'name' | 'price' | 'mass'): void {
    if (this.sortField() === field) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
  }

  private sortedProds = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const field = this.sortField();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    let prods = this.data.products();
    if (q) prods = prods.filter(p => p.name.toLowerCase().includes(q) || p.desc?.toLowerCase().includes(q));
    return [...prods].sort((a, b) => {
      if (field === 'name') return dir * a.name.localeCompare(b.name);
      if (field === 'price') return dir * ((a.price ?? 0) - (b.price ?? 0));
      if (field === 'mass') return dir * ((a.mass ?? 0) - (b.mass ?? 0));
      return 0;
    });
  });

  uncategorizedProducts = computed(() => {
    const catIds = new Set(this.data.categories().map(c => c.id));
    return this.sortedProds().filter(p => !p.catId || !catIds.has(p.catId));
  });

  productsForCat(catId: string) {
    return this.sortedProds().filter(p => p.catId === catId);
  }

  startSelect(): void { this.selectMode.set(true); this.selectedIds.set(new Set()); }
  cancelSelect(): void { this.selectMode.set(false); this.selectedIds.set(new Set()); }

  toggleSelect(id: string): void {
    const set = new Set(this.selectedIds());
    set.has(id) ? set.delete(id) : set.add(id);
    this.selectedIds.set(set);
  }

  onDeleteProduct(id: string): void {
    const p = this.data.products().find(x => x.id === id);
    const data: ConfirmDialogData = { message: `Usunąć "${p?.name}"?` };
    this.dialog.open(ConfirmDialogComponent, { width: '320px', data })
      .afterClosed().subscribe(ok => {
        if (ok) { this.data.deleteProduct(id); this.notify.notify('Usunięto'); }
      });
  }

  openProductDetail(product: Product): void {
    this.dialog.open(ProductDetailComponent, { width: '500px', data: product, panelClass: 'detail-dialog' });
  }

  openCategoryModal(): void {
    this.dialog.open(CategoryModalComponent, { width: '360px' });
  }

  openProductModal(product: Product | null, defaultCatId: string): void {
    const data: ProductModalData = { product, defaultCatId };
    this.dialog.open(ProductModalComponent, { width: '420px', data });
  }

  openOrderModal(): void {
    if (this.selectedIds().size === 0) {
      this.notify.notify('Zaznacz przynajmniej jeden produkt');
      return;
    }
    const data: OrderModalData = { selectedIds: Array.from(this.selectedIds()) };
    const ref = this.dialog.open(OrderModalComponent, { width: '360px', data });
    ref.afterClosed().subscribe(created => {
      if (created) { this.cancelSelect(); this.router.navigate(['/orders']); }
    });
  }
}
