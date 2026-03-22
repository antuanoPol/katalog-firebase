import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Product } from '../../../core/models/catalog.models';

@Component({
  selector: 'app-product-item',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="prod-item" [class.selected]="qty() > 0">

      <!-- Thumbnail -->
      <div class="prod-thumb" (click)="thumbSrc() && openLightbox.emit(thumbSrc())">
        @if (thumbSrc()) {
          <img [src]="thumbSrc()" [alt]="product().name" />
        } @else {
          <mat-icon>photo_camera</mat-icon>
        }
      </div>

      <!-- Info -->
      <div class="prod-info" (click)="!selectMode() && view.emit(product())" [class.clickable]="!selectMode()">
        <div class="prod-name">{{ product().name }}</div>
        <div class="prod-meta">
          <span class="prod-price">{{ product().price | number:'1.2-2' }} zł</span>
          @if (product().mass) {
            <span class="prod-mass">· {{ product().mass }} g</span>
          }
          @if (imgCount() > 1) {
            <span class="prod-imgs">· {{ imgCount() }} zdjęć</span>
          }
        </div>
        @if (product().desc) {
          <div class="prod-desc">{{ product().desc | slice:0:50 }}{{ product().desc.length > 50 ? '…' : '' }}</div>
        }
      </div>

      <!-- Actions -->
      @if (selectMode()) {
        @if (qty() > 0) {
          <div class="qty-stepper">
            <button class="qty-btn" (click)="setQty.emit(qty() - 1)">
              <mat-icon>{{ qty() === 1 ? 'close' : 'remove' }}</mat-icon>
            </button>
            <span class="qty-val">{{ qty() }}</span>
            <button class="qty-btn add" (click)="setQty.emit(qty() + 1)">
              <mat-icon>add</mat-icon>
            </button>
          </div>
        } @else {
          <button class="qty-add-btn" (click)="setQty.emit(1)" matTooltip="Dodaj do paczki">
            <mat-icon>add_circle_outline</mat-icon>
          </button>
        }
      } @else {
        <div class="prod-actions">
          <button mat-icon-button (click)="edit.emit(product())" matTooltip="Edytuj">
            <mat-icon>edit</mat-icon>
          </button>
          <button mat-icon-button (click)="delete.emit(product().id)" matTooltip="Usuń">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .prod-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; border-bottom: 1px solid var(--border);
      transition: background .15s;
      animation: fadeUp .35s ease both;
    }
    .prod-item:hover { background: var(--surface-2); }
    .prod-item.selected {
      background: rgba(255,193,7,.06);
      border-left: 2px solid var(--primary);
    }
    .prod-thumb {
      width: 46px; height: 46px; border-radius: 10px; flex-shrink: 0;
      overflow: hidden; background: var(--surface-2);
      border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      transition: border-color .2s, transform .2s;
    }
    .prod-thumb:hover { border-color: var(--primary); transform: scale(1.04); }
    .prod-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .prod-thumb mat-icon { color: var(--text-muted); font-size: 20px; }
    .prod-info { flex: 1; min-width: 0; }
    .prod-info.clickable { cursor: pointer; }
    .prod-info.clickable:hover .prod-name { color: var(--primary); }
    .prod-name { font-weight: 600; font-size: 14px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .prod-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .prod-price { font-weight: 700; color: var(--primary); }
    .prod-mass { margin-left: 4px; }
    .prod-imgs { margin-left: 4px; color: var(--primary); }
    .prod-desc { font-size: 11px; color: var(--text-muted); margin-top: 3px; opacity: .7; }
    .prod-actions { display: flex; opacity: 0; transition: opacity .2s; }
    .prod-item:hover .prod-actions { opacity: 1; }
    @media (hover: none) { .prod-actions { opacity: 1; } }
    .qty-stepper {
      display: flex; align-items: center; gap: 4px; flex-shrink: 0;
    }
    .qty-btn {
      width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--border-amber);
      background: rgba(255,193,7,.1); color: var(--primary);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background .15s; flex-shrink: 0;
    }
    .qty-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .qty-btn:hover { background: rgba(255,193,7,.22); }
    .qty-btn.add { background: rgba(255,193,7,.18); }
    .qty-val {
      min-width: 26px; text-align: center;
      font-size: 14px; font-weight: 700; color: var(--primary);
    }
    .qty-add-btn {
      background: none; border: none; cursor: pointer; padding: 4px;
      display: flex; align-items: center; color: var(--text-muted);
      border-radius: 8px; transition: color .15s;
    }
    .qty-add-btn:hover { color: var(--primary); }
    .qty-add-btn mat-icon { font-size: 24px; width: 24px; height: 24px; }
  `],
})
export class ProductItemComponent {
  product = input.required<Product>();
  selectMode = input<boolean>(false);
  qty = input<number>(0);

  view = output<Product>();
  edit = output<Product>();
  delete = output<string>();
  setQty = output<number>();
  openLightbox = output<string>();

  thumbSrc() {
    const p = this.product();
    return p.imgs?.[0] ?? p.img ?? '';
  }

  imgCount() {
    const p = this.product();
    return p.imgs?.length ?? (p.img ? 1 : 0);
  }
}
