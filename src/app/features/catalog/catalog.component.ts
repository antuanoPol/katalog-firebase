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
  imports: [
    CommonModule, MatButtonModule, MatIconModule,
    CategoryGroupComponent,
  ],
  template: `
    <!-- Toolbar -->
    <div class="catalog-toolbar">
      @if (!selectMode()) {
        <button mat-stroked-button (click)="openCategoryModal()">
          <mat-icon>create_new_folder</mat-icon> Nowa kategoria
        </button>
        <button mat-raised-button color="primary" (click)="openProductModal(null, '')">
          <mat-icon>add</mat-icon> Produkt
        </button>
        @if (data.products().length > 0) {
          <button mat-stroked-button color="accent" (click)="startSelect()">
            <mat-icon>check_box</mat-icon> Do paczki
          </button>
        }
      } @else {
        <div class="select-toolbar">
          <span class="select-count">Zaznaczono: {{ selectedIds().size }}</span>
          <button mat-stroked-button (click)="cancelSelect()">
            <mat-icon>close</mat-icon> Anuluj
          </button>
          <button mat-raised-button color="warn" (click)="openOrderModal()"
            [disabled]="selectedIds().size === 0">
            <mat-icon>local_shipping</mat-icon> Utwórz zamówienie →
          </button>
        </div>
      }
    </div>

    <!-- Empty state -->
    @if (data.categories().length === 0) {
      <div class="empty-state">
        <mat-icon class="empty-icon">inventory_2</mat-icon>
        <p>Brak produktów. Dodaj kategorię aby zacząć.</p>
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
      background: white; border-bottom: 1px solid #e0e0e0;
      position: sticky; top: 0; z-index: 9;
    }
    .select-toolbar { display: flex; align-items: center; gap: 8px; flex: 1; flex-wrap: wrap; }
    .select-count { font-weight: 500; color: #1976d2; }
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 80px 24px; color: rgba(0,0,0,.38);
    }
    .empty-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 16px; opacity: .3; }
    .lightbox {
      position: fixed; inset: 0; background: rgba(0,0,0,.9);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999; cursor: zoom-out;
    }
    .lightbox img { max-width: 95vw; max-height: 95vh; object-fit: contain; border-radius: 8px; }
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
      if (created) {
        this.cancelSelect();
        this.router.navigate(['/orders']);
      }
    });
  }
}
