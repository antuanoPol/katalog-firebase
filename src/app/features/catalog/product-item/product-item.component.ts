import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Product } from '../../../core/models/catalog.models';

@Component({
  selector: 'app-product-item',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCheckboxModule, MatTooltipModule],
  template: `
    <div class="prod-item" [class.selected]="selected()">

      <!-- Thumbnail -->
      <div class="prod-thumb" (click)="product().img && openLightbox.emit(product().img)">
        @if (product().img) {
          <img [src]="product().img" [alt]="product().name" />
        } @else {
          <mat-icon>photo_camera</mat-icon>
        }
      </div>

      <!-- Info -->
      <div class="prod-info">
        <div class="prod-name">{{ product().name }}</div>
        <div class="prod-meta">
          <span class="prod-price">{{ product().price | number:'1.2-2' }} zł</span>
          @if (product().mass) {
            <span class="prod-mass">· {{ product().mass }} g</span>
          }
        </div>
        @if (product().desc) {
          <div class="prod-desc">{{ product().desc | slice:0:50 }}{{ product().desc.length > 50 ? '…' : '' }}</div>
        }
      </div>

      <!-- Actions -->
      @if (selectMode()) {
        <mat-checkbox [checked]="selected()" (change)="toggleSelect.emit(product().id)" color="primary" />
      } @else {
        <div class="prod-actions">
          <button mat-icon-button (click)="edit.emit(product())" matTooltip="Edytuj">
            <mat-icon>edit</mat-icon>
          </button>
          <button mat-icon-button color="warn" (click)="delete.emit(product().id)" matTooltip="Usuń">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .prod-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 16px; border-bottom: 1px solid var(--border-subtle);
      transition: background .15s;
    }
    .prod-item:hover { background: var(--bg-hover); }
    .prod-item.selected { background: var(--primary-dim); border-left: 2px solid var(--primary); }
    .prod-thumb {
      width: 48px; height: 48px; border-radius: 8px; flex-shrink: 0;
      overflow: hidden; background: var(--bg-surface); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .prod-thumb:hover { border-color: var(--primary); box-shadow: var(--glow-sm); }
    .prod-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .prod-thumb mat-icon { color: var(--text-muted); }
    .prod-info { flex: 1; min-width: 0; }
    .prod-name { font-weight: 600; font-size: 14px; color: var(--text); }
    .prod-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .prod-price { font-weight: 600; color: var(--primary); }
    .prod-mass { margin-left: 4px; }
    .prod-desc { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
    .prod-actions { display: flex; }
  `],
})
export class ProductItemComponent {
  product = input.required<Product>();
  selectMode = input<boolean>(false);
  selected = input<boolean>(false);

  edit = output<Product>();
  delete = output<string>();
  toggleSelect = output<string>();
  openLightbox = output<string>();
}
