import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import { CategoryGroupComponent } from './category-group/category-group.component';
import { CategoryModalComponent } from '../../shared/modals/category-modal/category-modal.component';
import { ProductModalComponent, ProductModalData } from '../../shared/modals/product-modal/product-modal.component';
import { OrderModalComponent, OrderModalData } from '../../shared/modals/order-modal/order-modal.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/modals/confirm-dialog/confirm-dialog.component';
import { Product } from '../../core/models/catalog.models';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, CategoryGroupComponent],
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
        (toggleCollapse)="data.toggleCategoryCollapse($event)"
        (addProduct)="openProductModal(null, $event)"
        (editProduct)="openProductModal($event, $event.catId)"
        (deleteProduct)="onDeleteProduct($event)"
        (deleteCategory)="data.deleteCategory($event)"
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
    .select-toolbar { display: flex; align-items: center; gap: 8px; flex: 1; flex-wrap: wrap; }
    .select-badge {
      font-weight: 700; color: var(--primary); font-size: 13px; letter-spacing: .04em;
      background: var(--primary-glow); border: 1px solid var(--border-amber);
      padding: 4px 12px; border-radius: 20px;
    }
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

  productsForCat(catId: string) {
    return this.data.products().filter(p => p.catId === catId);
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
