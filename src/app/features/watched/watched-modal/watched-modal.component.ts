import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { WatchedItem } from '../../../core/models/catalog.models';

export interface WatchedModalData { item?: WatchedItem; }

@Component({
  selector: 'app-watched-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule],
  template: `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">{{ data.item ? 'Edytuj' : 'Dodaj obserwowane' }}</span>
        <button class="close-btn" (click)="dialogRef.close()"><mat-icon>close</mat-icon></button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>Nazwa *</label>
          <input [(ngModel)]="name" placeholder="np. Nike Air Max 42" />
        </div>
        <div class="field">
          <label>Link</label>
          <input [(ngModel)]="link" placeholder="https://vinted.pl/..." />
        </div>
        <div class="row2">
          <div class="field">
            <label>Cena kupna (zł) *</label>
            <input type="number" [(ngModel)]="buyPrice" placeholder="0.00" />
          </div>
          <div class="field">
            <label>Kategoria</label>
            <input [(ngModel)]="category" placeholder="Buty, Ciuchy..." />
          </div>
        </div>
        <div class="row2">
          <div class="field">
            <label>Rozmiar</label>
            <input [(ngModel)]="size" placeholder="M, L, 42..." />
          </div>
          <div class="field">
            <label>Marka</label>
            <input [(ngModel)]="brand" placeholder="Nike, Adidas..." />
          </div>
        </div>
        <div class="row2">
          <div class="field">
            <label>Platforma</label>
            <input [(ngModel)]="platform" placeholder="Vinted, OLX..." />
          </div>
          <div class="field">
            <label>Status</label>
            <select [(ngModel)]="status">
              <option value="watching">Obserwuję</option>
              <option value="bought">Kupione</option>
              <option value="sold">Sprzedane</option>
            </select>
          </div>
        </div>
        @if (status === 'sold') {
          <div class="field">
            <label>Cena sprzedaży (zł)</label>
            <input type="number" [(ngModel)]="sellPrice" placeholder="0.00" />
          </div>
        }
        <div class="field">
          <label>Notatki</label>
          <textarea [(ngModel)]="notes" placeholder="Dodatkowe informacje..." rows="2"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" (click)="dialogRef.close()">Anuluj</button>
        <button class="btn-primary" (click)="save()" [disabled]="!name || !buyPrice">
          {{ data.item ? 'Zapisz' : 'Dodaj' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .modal { display: flex; flex-direction: column; max-height: 90vh; }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px 12px; border-bottom: 1px solid var(--border);
    }
    .modal-title { font-size: 16px; font-weight: 700; color: var(--text); }
    .close-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; }
    .modal-body { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: .06em; }
    input, select, textarea {
      background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px;
      padding: 8px 10px; color: var(--text); font-size: 13px; font-family: inherit;
      outline: none; transition: border-color .2s; width: 100%; box-sizing: border-box;
    }
    input:focus, select:focus, textarea:focus { border-color: var(--border-amber); }
    textarea { resize: vertical; min-height: 60px; }
    select option { background: var(--surface-2); }
    .modal-footer {
      display: flex; gap: 8px; justify-content: flex-end;
      padding: 12px 20px 16px; border-top: 1px solid var(--border);
    }
    .btn-ghost {
      padding: 8px 16px; border-radius: 10px; border: 1px solid var(--border);
      background: var(--surface-2); color: var(--text); font-size: 13px;
      font-weight: 600; cursor: pointer; font-family: inherit;
    }
    .btn-primary {
      padding: 8px 20px; border-radius: 10px; border: none;
      background: var(--primary); color: #12121f; font-size: 13px;
      font-weight: 700; cursor: pointer; font-family: inherit;
    }
    .btn-primary:disabled { opacity: .4; cursor: not-allowed; }
  `],
})
export class WatchedModalComponent {
  dialogRef = inject(MatDialogRef<WatchedModalComponent>);
  data: WatchedModalData = inject(MAT_DIALOG_DATA);

  name = this.data.item?.name ?? '';
  link = this.data.item?.link ?? '';
  buyPrice = this.data.item?.buyPrice ?? null as any;
  sellPrice = this.data.item?.sellPrice ?? null as any;
  category = this.data.item?.category ?? '';
  size = this.data.item?.size ?? '';
  brand = this.data.item?.brand ?? '';
  platform = this.data.item?.platform ?? '';
  status: WatchedItem['status'] = this.data.item?.status ?? 'watching';
  notes = this.data.item?.notes ?? '';

  save(): void {
    if (!this.name || !this.buyPrice) return;
    const result: Partial<WatchedItem> = {
      name: this.name.trim(),
      link: this.link.trim() || undefined,
      buyPrice: +this.buyPrice,
      sellPrice: this.sellPrice ? +this.sellPrice : undefined,
      category: this.category.trim() || undefined,
      size: this.size.trim() || undefined,
      brand: this.brand.trim() || undefined,
      platform: this.platform.trim() || undefined,
      status: this.status,
      notes: this.notes.trim() || undefined,
      soldDate: this.status === 'sold' ? (this.data.item?.soldDate ?? new Date().toISOString().slice(0, 10)) : undefined,
    };
    this.dialogRef.close(result);
  }
}
