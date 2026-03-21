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
        <!-- Search + Sort + Count (right-aligned group) -->
        <div class="toolbar-right">
          <div class="search-box">
            <mat-icon class="search-icon">search</mat-icon>
            <input class="search-input" [(ngModel)]="searchQuery"
              placeholder="Szukaj produktu..." />
            @if (searchQuery) {
              <button class="search-clear" (click)="searchQuery = ''">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>
          <div class="sort-group">
            <button class="sort-btn" [class.active]="sortField === 'name'" (click)="setSort('name')">
              Nazwa {{ sortField === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : '' }}
            </button>
            <button class="sort-btn" [class.active]="sortField === 'price'" (click)="setSort('price')">
              Cena {{ sortField === 'price' ? (sortDir === 'asc' ? '↑' : '↓') : '' }}
            </button>
            <button class="sort-btn" [class.active]="sortField === 'mass'" (click)="setSort('mass')">
              Masa {{ sortField === 'mass' ? (sortDir === 'asc' ? '↑' : '↓') : '' }}
            </button>
          </div>
          @if (data.products().length > 0) {
            <span class="prod-count-chip">{{ data.products().length }} szt.</span>
          }
        </div>
      } @else {
        <div class="select-toolbar">
          <span class="select-badge">{{ selectedIds().size }} zaznaczone</span>
          <button class="tool-btn ghost" (click)="cancelSelect()">
            <mat-icon>close</mat-icon> Anuluj
          </button>
          <button class="tool-btn primary" (click)="openOrderModal()"
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
        [forceExpand]="!!searchQuery"
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
      display: flex; gap: 8px; padding: 12px 16px; flex-wrap: wrap;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 9;
      animation: fadeUp .3s ease;
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
    .toolbar-right {
      display: flex; align-items: center; gap: 6px; flex: 1;
      justify-content: flex-end; flex-wrap: wrap;
    }
    .prod-count-chip {
      font-size: 11px; font-weight: 700; color: var(--primary);
      background: var(--primary-glow); border: 1px solid var(--border-amber);
      padding: 4px 10px; border-radius: 20px; letter-spacing: .04em;
      white-space: nowrap;
    }
    .select-toolbar { display: flex; align-items: center; gap: 8px; flex: 1; flex-wrap: wrap; }
    .select-badge {
      font-weight: 700; color: var(--primary); font-size: 13px; letter-spacing: .04em;
      background: var(--primary-glow); border: 1px solid var(--border-amber);
      padding: 4px 12px; border-radius: 20px;
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
  private router = inject(Router);

  selectMode = signal(false);
  selectedIds = signal<Set<string>>(new Set());
  lightboxSrc = signal('');
  showLightbox = signal(false);

  searchQuery = '';
  sortField: 'name' | 'price' | 'mass' = 'name';
  sortDir: 'asc' | 'desc' = 'asc';

  setSort(field: 'name' | 'price' | 'mass'): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
  }

  uncategorizedProducts = computed(() => {
    const catIds = new Set(this.data.categories().map(c => c.id));
    let prods = this.data.products().filter(p => !p.catId || !catIds.has(p.catId));
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      prods = prods.filter(p => p.name.toLowerCase().includes(q) || p.desc?.toLowerCase().includes(q));
    }
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return [...prods].sort((a, b) => {
      if (this.sortField === 'name') return dir * a.name.localeCompare(b.name);
      if (this.sortField === 'price') return dir * (a.price - b.price);
      if (this.sortField === 'mass') return dir * (a.mass - b.mass);
      return 0;
    });
  });

  productsForCat(catId: string) {
    let prods = this.data.products().filter(p => p.catId === catId);
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      prods = prods.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.desc?.toLowerCase().includes(q)
      );
    }
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return [...prods].sort((a, b) => {
      if (this.sortField === 'name') return dir * a.name.localeCompare(b.name);
      if (this.sortField === 'price') return dir * (a.price - b.price);
      if (this.sortField === 'mass') return dir * (a.mass - b.mass);
      return 0;
    });
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
