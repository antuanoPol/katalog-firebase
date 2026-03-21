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
  { fg: '#ffc107', bg: 'rgba(255,193,7,.12)',   border: 'rgba(255,193,7,.3)'   },
  { fg: '#ff6b35', bg: 'rgba(255,107,53,.1)',   border: 'rgba(255,107,53,.3)'  },
  { fg: '#4ade80', bg: 'rgba(74,222,128,.1)',   border: 'rgba(74,222,128,.3)'  },
  { fg: '#38bdf8', bg: 'rgba(56,189,248,.1)',   border: 'rgba(56,189,248,.3)'  },
  { fg: '#e879f9', bg: 'rgba(232,121,249,.1)',  border: 'rgba(232,121,249,.3)' },
  { fg: '#f43f5e', bg: 'rgba(244,63,94,.1)',    border: 'rgba(244,63,94,.3)'   },
  { fg: '#a78bfa', bg: 'rgba(167,139,250,.1)',  border: 'rgba(167,139,250,.3)' },
  { fg: '#34d399', bg: 'rgba(52,211,153,.1)',   border: 'rgba(52,211,153,.3)'  },
  { fg: '#fb923c', bg: 'rgba(251,146,60,.1)',   border: 'rgba(251,146,60,.3)'  },
  { fg: '#2dd4bf', bg: 'rgba(45,212,191,.1)',   border: 'rgba(45,212,191,.3)'  },
];

@Component({
  selector: 'app-category-group',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, ProductItemComponent],
  template: `
    <div class="cat-group">
      <!-- Header -->
      <div class="cat-header" [style.border-left-color]="color().fg">
        <button class="collapse-btn" (click)="toggleCollapse.emit(category().id)"
          [style.color]="color().fg">
          <mat-icon>{{ category().collapsed ? 'expand_more' : 'expand_less' }}</mat-icon>
        </button>
        <span class="cat-name" [style.color]="color().fg">{{ category().name }}</span>
        <span class="cat-count" [style.background]="color().bg" [style.color]="color().fg"
          [style.border-color]="color().border">{{ products().length }}</span>
        <div class="cat-actions">
          <button mat-icon-button (click)="addProduct.emit(category().id)" matTooltip="Dodaj produkt"
            [style.color]="color().fg">
            <mat-icon>add</mat-icon>
          </button>
          <button mat-icon-button (click)="onDelete()" matTooltip="Usuń kategorię"
            [style.color]="color().fg">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      </div>

      <!-- Products -->
      @if (!category().collapsed || forceExpand()) {
        @for (product of products(); track product.id) {
          <app-product-item
            [product]="product"
            [selectMode]="selectMode()"
            [selected]="selectedIds().has(product.id)"
            (view)="viewProduct.emit($event)"
            (edit)="editProduct.emit($event)"
            (delete)="deleteProduct.emit($event)"
            (duplicate)="duplicateProduct.emit($event)"
            (toggleSelect)="toggleSelect.emit($event)"
            (openLightbox)="openLightbox.emit($event)"
          />
        }
        @if (products().length === 0) {
          <div class="empty-cat">Pusta kategoria — kliknij + aby dodać produkt</div>
        }
      }
    </div>
  `,
  styles: [`
    .cat-group { border-bottom: 1px solid var(--border); }
    .cat-header {
      display: flex; align-items: center; padding: 8px 12px 8px 0;
      position: sticky; top: 61px; z-index: 8;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      border-left: 3px solid transparent;
      transition: background .2s;
    }
    .cat-header:hover { background: var(--surface-2); }
    .collapse-btn {
      background: none; border: none; cursor: pointer;
      display: flex; align-items: center; padding: 4px 8px;
      border-radius: 6px; transition: background .2s;
    }
    .collapse-btn:hover { background: rgba(255,255,255,.05); }
    .collapse-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .cat-name { font-weight: 700; font-size: 11px; flex: 1; letter-spacing: .08em; text-transform: uppercase; }
    .cat-count {
      font-size: 10px; border-radius: 20px; border: 1px solid;
      padding: 2px 8px; margin-right: 4px; font-weight: 700; letter-spacing: .04em;
    }
    .cat-actions { display: flex; }
    .empty-cat { padding: 14px 16px; font-size: 12px; color: var(--text-muted); font-style: italic; }
  `],
})
export class CategoryGroupComponent {
  category = input.required<Category>();
  products = input.required<Product[]>();
  colorIndex = input<number>(0);
  selectMode = input<boolean>(false);
  selectedIds = input<Set<string>>(new Set());
  forceExpand = input<boolean>(false);

  toggleCollapse = output<string>();
  addProduct = output<string>();
  editProduct = output<Product>();
  deleteProduct = output<string>();
  duplicateProduct = output<Product>();
  viewProduct = output<Product>();
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
