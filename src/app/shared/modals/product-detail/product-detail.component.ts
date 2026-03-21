import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../../../core/services/data.service';
import { Product } from '../../../core/models/catalog.models';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="detail-wrap">

      <!-- Images gallery -->
      @if (allImgs().length > 0) {
        <div class="gallery">
          <div class="main-img-wrap">
            <img [src]="allImgs()[$index()]" class="main-img" />
            @if (allImgs().length > 1) {
              <button class="nav-btn prev" (click)="prev()" [disabled]="$index() === 0">
                <mat-icon>chevron_left</mat-icon>
              </button>
              <button class="nav-btn next" (click)="next()" [disabled]="$index() === allImgs().length - 1">
                <mat-icon>chevron_right</mat-icon>
              </button>
              <span class="img-counter">{{ $index() + 1 }} / {{ allImgs().length }}</span>
            }
          </div>
          @if (allImgs().length > 1) {
            <div class="thumbs">
              @for (img of allImgs(); track img; let i = $index) {
                <img [src]="img" class="thumb" [class.active]="i === $index()"
                  (click)="currentIndex.set(i)" />
              }
            </div>
          }
        </div>
      } @else {
        <div class="no-img">
          <mat-icon>photo_camera</mat-icon>
          <span>Brak zdjęcia</span>
        </div>
      }

      <!-- Details -->
      <div class="details">
        <h2 class="prod-name">{{ product.name }}</h2>
        <div class="cat-badge">{{ categoryName() }}</div>

        <div class="params-grid">
          <div class="param">
            <span class="param-label">Cena zakupu</span>
            <span class="param-val price">{{ product.price | number:'1.2-2' }} zł</span>
          </div>
          @if (product.mass) {
            <div class="param">
              <span class="param-label">Masa</span>
              <span class="param-val">{{ product.mass }} g</span>
            </div>
          }
        </div>

        @if (product.desc) {
          <div class="desc-section">
            <div class="section-label">Opis</div>
            <div class="desc-text">{{ product.desc }}</div>
          </div>
        }

        @if (product.link) {
          <a [href]="product.link" target="_blank" class="link-btn">
            <mat-icon>open_in_new</mat-icon> Otwórz link
          </a>
        }
      </div>

      <mat-dialog-actions align="end" style="padding: 8px 16px;">
        <button mat-button mat-dialog-close>Zamknij</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .detail-wrap { min-width: 320px; max-width: 480px; width: 100%; }
    .gallery { width: 100%; }
    .main-img-wrap { position: relative; background: #111; }
    .main-img { width: 100%; max-height: 320px; object-fit: contain; display: block; }
    .nav-btn {
      position: absolute; top: 50%; transform: translateY(-50%);
      background: rgba(0,0,0,.5); border: none; border-radius: 50%;
      width: 36px; height: 36px; cursor: pointer; color: white;
      display: flex; align-items: center; justify-content: center;
      transition: background .2s;
    }
    .nav-btn:disabled { opacity: .3; cursor: default; }
    .nav-btn:hover:not(:disabled) { background: rgba(0,0,0,.75); }
    .nav-btn.prev { left: 8px; }
    .nav-btn.next { right: 8px; }
    .nav-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .img-counter {
      position: absolute; bottom: 8px; right: 10px;
      background: rgba(0,0,0,.6); color: white;
      font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px;
    }
    .thumbs { display: flex; gap: 6px; padding: 8px; overflow-x: auto; background: rgba(0,0,0,.3); }
    .thumb { width: 52px; height: 52px; object-fit: cover; border-radius: 6px; cursor: pointer; opacity: .6; transition: opacity .2s, outline .2s; flex-shrink: 0; }
    .thumb.active { opacity: 1; outline: 2px solid var(--primary); }
    .no-img { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 24px; color: var(--text-muted, #888); }
    .no-img mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .details { padding: 16px 24px 0; }
    .prod-name { margin: 0 0 6px; font-size: 20px; font-weight: 800; color: var(--text, #fff); }
    .cat-badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 20px; background: var(--primary-glow, rgba(255,193,7,.15)); color: var(--primary, #ffc107); border: 1px solid var(--border-amber, rgba(255,193,7,.3)); margin-bottom: 16px; }
    .params-grid { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
    .param { background: var(--surface-2, #1e1e2e); border: 1px solid var(--border, #2a2a3a); border-radius: 10px; padding: 12px 16px; min-width: 100px; }
    .param-label { display: block; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--text-muted, #888); margin-bottom: 4px; }
    .param-val { font-size: 18px; font-weight: 800; color: var(--text, #fff); }
    .param-val.price { color: var(--primary, #ffc107); }
    .desc-section { margin-bottom: 16px; }
    .section-label { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--text-muted, #888); margin-bottom: 6px; }
    .desc-text { font-size: 14px; color: var(--text, #fff); line-height: 1.6; white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word; }
    .link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; background: var(--surface-2, #1e1e2e); border: 1px solid var(--border, #2a2a3a); color: var(--primary, #ffc107); text-decoration: none; font-size: 13px; font-weight: 600; margin-bottom: 8px; transition: border-color .2s; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .link-btn:hover { border-color: var(--border-amber, rgba(255,193,7,.4)); }
    .link-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
  `],
})
export class ProductDetailComponent {
  private data = inject(DataService);
  private dialogRef = inject(MatDialogRef<ProductDetailComponent>);
  product: Product = inject(MAT_DIALOG_DATA);

  currentIndex = signal(0);

  $index() { return this.currentIndex(); }

  allImgs() {
    const p = this.product;
    return p.imgs?.length ? p.imgs : (p.img ? [p.img] : []);
  }

  categoryName() {
    return this.data.categories().find(c => c.id === this.product.catId)?.name ?? '';
  }

  prev() { this.currentIndex.update(i => Math.max(0, i - 1)); }
  next() { this.currentIndex.update(i => Math.min(this.allImgs().length - 1, i + 1)); }
}
