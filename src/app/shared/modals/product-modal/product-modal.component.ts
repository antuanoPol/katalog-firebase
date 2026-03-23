import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../../../core/services/data.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ImageService } from '../../../core/services/image.service';
import { Product } from '../../../core/models/catalog.models';
import { MatProgressBarModule } from '@angular/material/progress-bar';

export interface ProductModalData {
  product: Product | null;
  defaultCatId?: string;
}

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatProgressBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ dialogData.product ? 'Edytuj produkt' : 'Nowy produkt' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="product-form">

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Kategoria</mat-label>
          <mat-select formControlName="catId">
            <mat-option value="">— Bez kategorii —</mat-option>
            @for (cat of data.categories(); track cat.id) {
              <mat-option [value]="cat.id">{{ cat.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Images -->
        <div class="imgs-section">
          <div class="imgs-label">Zdjęcia ({{ images().length }})</div>
          <div class="imgs-list">
            @for (img of images(); track img) {
              <div class="img-item">
                <img [src]="img" class="img-thumb" />
                <div class="img-item-actions">
                  @if ($index > 0) {
                    <button mat-icon-button type="button" (click)="moveImg($index, -1)" class="img-act-btn">
                      <mat-icon>arrow_back</mat-icon>
                    </button>
                  }
                  @if ($index < images().length - 1) {
                    <button mat-icon-button type="button" (click)="moveImg($index, 1)" class="img-act-btn">
                      <mat-icon>arrow_forward</mat-icon>
                    </button>
                  }
                  <button mat-icon-button type="button" (click)="removeImg($index)" class="img-act-btn danger">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
                @if ($index === 0) {
                  <span class="img-main-badge">Główne</span>
                }
              </div>
            }
          </div>
          @if (uploading()) {
            <mat-progress-bar mode="indeterminate" style="margin-bottom: 8px; border-radius: 4px;"></mat-progress-bar>
          }
          <div class="imgs-add">
            <button mat-stroked-button color="primary" type="button" (click)="fileInput.click()" [disabled]="uploading()">
              <mat-icon>add_photo_alternate</mat-icon> {{ uploading() ? 'Przesyłam...' : 'Dodaj zdjęcie' }}
            </button>
            <div class="url-row">
              <input class="url-input" #urlInput placeholder="lub wklej URL i zatwierdź →"
                (keydown.enter)="addFromUrl(urlInput.value); urlInput.value = ''" />
              <button mat-icon-button type="button" (click)="addFromUrl(urlInput.value); urlInput.value = ''">
                <mat-icon>add</mat-icon>
              </button>
            </div>
          </div>
          <input #fileInput type="file" accept="image/*" multiple style="display:none"
            (change)="onFilesChange($event)" />
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nazwa</mat-label>
          <input matInput formControlName="name" placeholder="nazwa produktu..." />
        </mat-form-field>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Cena (zł)</mat-label>
            <input matInput type="number" formControlName="price" placeholder="0.00" (focus)="$any($event.target).select()" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Masa (g)</mat-label>
            <input matInput type="number" formControlName="mass" placeholder="0" (focus)="$any($event.target).select()" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Link do produktu</mat-label>
          <input matInput formControlName="link" placeholder="https://..." />
          <mat-icon matSuffix>link</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Opis</mat-label>
          <textarea matInput formControlName="desc" rows="3"
            placeholder="stan, rozmiar, uwagi..."></textarea>
        </mat-form-field>

        <button type="button" class="watch-toggle" [class.active]="form.value.watched"
          (click)="form.patchValue({ watched: !form.value.watched })">
          <mat-icon>{{ form.value.watched ? 'visibility' : 'visibility_off' }}</mat-icon>
          {{ form.value.watched ? 'Obserwowane ceny — włączone' : 'Obserwowane ceny — wyłączone' }}
        </button>

      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Anuluj</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="form.invalid || uploading()">Zapisz</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .product-form { display: flex; flex-direction: column; gap: 4px; min-width: 300px; padding-top: 8px; }
    .full-width { width: 100%; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    mat-dialog-content { max-height: 70vh; overflow-y: auto; }
    .imgs-section { margin-bottom: 8px; }
    .imgs-label { font-size: 12px; color: var(--text-muted, #888); margin-bottom: 6px; font-weight: 600; }
    .imgs-list { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .img-item { position: relative; }
    .img-thumb { width: 72px; height: 72px; object-fit: cover; border-radius: 8px; border: 1px solid #e0e0e0; display: block; }
    .img-item-actions {
      position: absolute; inset: 0; background: rgba(0,0,0,.45);
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      gap: 2px; opacity: 0; transition: opacity .2s;
    }
    .img-item:hover .img-item-actions { opacity: 1; }
    .img-act-btn { width: 24px !important; height: 24px !important; line-height: 24px !important; }
    .img-act-btn mat-icon { font-size: 14px; width: 14px; height: 14px; color: white; }
    .img-act-btn.danger mat-icon { color: #f87171; }
    .img-main-badge {
      position: absolute; top: 3px; left: 3px;
      background: rgba(255,193,7,.9); color: #12121f;
      font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px;
    }
    .watch-toggle {
      display: flex; align-items: center; gap: 8px; width: 100%;
      padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border, #333);
      background: var(--surface-2, #1e1e2e); color: var(--text-muted, #888);
      font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
      transition: all .2s; text-align: left;
    }
    .watch-toggle mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .watch-toggle.active { border-color: #38bdf8; color: #38bdf8; background: rgba(56,189,248,.08); }
    .imgs-add { display: flex; flex-direction: column; gap: 6px; }
    .url-row { display: flex; align-items: center; gap: 4px; }
    .url-input {
      flex: 1; border: 1px solid var(--border, #555); border-radius: 6px;
      padding: 6px 10px; font-size: 12px; outline: none;
      background: transparent; color: inherit;
    }
    .url-input:focus { border-color: #7c3aed; }
    .url-input::placeholder { color: var(--text-muted, #888); }
  `],
})
export class ProductModalComponent implements OnInit {
  data = inject(DataService);
  private dialogRef = inject(MatDialogRef<ProductModalComponent>);
  dialogData: ProductModalData = inject(MAT_DIALOG_DATA);
  private notify = inject(NotificationService);
  private imgService = inject(ImageService);
  private fb = inject(FormBuilder);

  images = signal<string[]>([]);
  uploading = signal(false);

  form = this.fb.group({
    catId: [''],
    name: ['', Validators.required],
    price: [0],
    mass: [0],
    link: [''],
    desc: [''],
    watched: [false],
  });

  ngOnInit(): void {
    const p = this.dialogData.product;
    if (p) {
      this.form.patchValue({ catId: p.catId, name: p.name, price: p.price, mass: p.mass, link: p.link, desc: p.desc, watched: p.watched ?? false });
      const existing = p.imgs?.length ? p.imgs : (p.img ? [p.img] : []);
      this.images.set(existing);
    } else if (this.dialogData.defaultCatId) {
      this.form.patchValue({ catId: this.dialogData.defaultCatId });
    }
  }

  async onFilesChange(event: Event): Promise<void> {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    (event.target as HTMLInputElement).value = '';
    if (!files.length) return;
    this.uploading.set(true);
    try {
      for (const file of files) {
        const url = await this.imgService.uploadImage(file);
        this.images.update(imgs => [...imgs, url]);
      }
    } catch {
      this.notify.notify('Błąd przesyłania zdjęcia');
    } finally {
      this.uploading.set(false);
    }
  }

  @HostListener('paste', ['$event'])
  async onPaste(event: ClipboardEvent): Promise<void> {
    const items = event.clipboardData?.items;
    if (!items) return;
    const imageFiles = Array.from(items)
      .filter(i => i.type.startsWith('image/'))
      .map(i => i.getAsFile())
      .filter((f): f is File => f !== null);
    if (!imageFiles.length) return;
    event.preventDefault();
    this.uploading.set(true);
    try {
      for (const file of imageFiles) {
        const url = await this.imgService.uploadImage(file);
        this.images.update(imgs => [...imgs, url]);
      }
    } catch {
      this.notify.notify('Błąd przesyłania zdjęcia');
    } finally {
      this.uploading.set(false);
    }
  }

  addFromUrl(url: string): void {
    url = url.trim();
    if (url) this.images.update(imgs => [...imgs, url]);
  }

  removeImg(index: number): void {
    this.images.update(imgs => imgs.filter((_, i) => i !== index));
  }

  moveImg(index: number, dir: -1 | 1): void {
    this.images.update(imgs => {
      const next = [...imgs];
      const target = index + dir;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  onSave(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    const imgs = this.images();
    const productData = {
      catId: v.catId!,
      name: v.name!.trim(),
      price: Number(v.price) || 0,
      mass: Number(v.mass) || 0,
      img: imgs[0] ?? '',
      imgs,
      link: v.link?.trim() ?? '',
      desc: v.desc?.trim() ?? '',
      watched: v.watched ?? false,
    };
    const p = this.dialogData.product;
    if (p) {
      this.data.updateProduct(p.id, productData);
      this.notify.notify('Zaktualizowano');
    } else {
      this.data.addProduct(productData);
      this.notify.notify(`"${productData.name}" dodany`);
    }
    this.dialogRef.close();
  }
}
