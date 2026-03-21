import { Component, input, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { Category, Product } from '../../../core/models/catalog.models';
import { ProductItemComponent } from '../product-item/product-item.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/modals/confirm-dialog/confirm-dialog.component';

const COLORS = [
  { fg: '#4338ca', bg: '#eef2ff' }, { fg: '#0d9488', bg: '#f0fdfa' },
  { fg: '#d97706', bg: '#fffbeb' }, { fg: '#dc2626', bg: '#fef2f2' },
  { fg: '#059669', bg: '#ecfdf5' }, { fg: '#7c3aed', bg: '#f5f3ff' },
  { fg: '#db2777', bg: '#fdf2f8' }, { fg: '#2563eb', bg: '#eff6ff' },
  { fg: '#b45309', bg: '#fefce8' }, { fg: '#0891b2', bg: '#ecfeff' },
];

@Component({
  selector: 'app-category-group',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, ProductItemComponent],
  template: `
    <div class="cat-group">
      <!-- Header -->
      <div class="cat-header" [style.background]="color().bg" [style.color]="color().fg">
        <button mat-icon-button (click)="toggleCollapse.emit(category().id)"
          [style.color]="color().fg" class="collapse-btn">
          <mat-icon>{{ category().collapsed ? 'expand_more' : 'expand_less' }}</mat-icon>
        </button>
        <span class="cat-name">{{ category().name }}</span>
        <span class="cat-count">{{ products().length }}</span>
        <div class="cat-actions">
          <button mat-icon-button [style.color]="color().fg"
            (click)="addProduct.emit(category().id)" matTooltip="Dodaj produkt">
            <mat-icon>add</mat-icon>
          </button>
          <button mat-icon-button [style.color]="color().fg"
            (click)="onDelete()" matTooltip="Usuń kategorię">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      </div>

      <!-- Products -->
      @if (!category().collapsed) {
        @for (product of products(); track product.id) {
          <app-product-item
            [product]="product"
            [selectMode]="selectMode()"
            [selected]="selectedIds().has(product.id)"
            (edit)="editProduct.emit($event)"
            (delete)="deleteProduct.emit($event)"
            (toggleSelect)="toggleSelect.emit($event)"
            (openLightbox)="openLightbox.emit($event)"
          />
        }
        @if (products().length === 0) {
          <div class="empty-cat">Pusta kategoria — dodaj produkt</div>
        }
      }
    </div>
  `,
  styles: [`
    .cat-group { border-bottom: 2px solid #e0e0e0; }
    .cat-header {
      display: flex; align-items: center; padding: 4px 8px 4px 4px;
      position: sticky; top: 61px; z-index: 10;
    }
    .cat-name { font-weight: 600; font-size: 14px; flex: 1; }
    .cat-count {
      font-size: 11px; background: rgba(0,0,0,.12); border-radius: 10px;
      padding: 1px 7px; margin-right: 4px;
    }
    .cat-actions { display: flex; }
    .collapse-btn { flex-shrink: 0; }
    .empty-cat { padding: 12px 16px; font-size: 13px; color: rgba(0,0,0,.38); font-style: italic; }
  `],
})
export class CategoryGroupComponent {
  category = input.required<Category>();
  products = input.required<Product[]>();
  colorIndex = input<number>(0);
  selectMode = input<boolean>(false);
  selectedIds = input<Set<string>>(new Set());

  toggleCollapse = output<string>();
  addProduct = output<string>();
  editProduct = output<Product>();
  deleteProduct = output<string>();
  deleteCategory = output<string>();
  toggleSelect = output<string>();
  openLightbox = output<string>();

  private dialog = inject(MatDialog);
  color = computed(() => COLORS[this.colorIndex() % COLORS.length]);

  onDelete(): void {
    const count = this.products().length;
    const msg = count > 0
      ? `Usunąć "${this.category().name}" z ${count} produktami?`
      : `Usunąć "${this.category().name}"?`;
    const data: ConfirmDialogData = { message: msg };
    this.dialog.open(ConfirmDialogComponent, { width: '320px', data })
      .afterClosed().subscribe(ok => { if (ok) this.deleteCategory.emit(this.category().id); });
  }
}
