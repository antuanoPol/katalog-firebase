import { Component, inject, signal, OnInit } from '@angular/core';
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
    MatSelectModule, MatButtonModule, MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ dialogData.product ? 'Edytuj produkt' : 'Nowy produkt' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="product-form">

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Kategoria</mat-label>
          <mat-select formControlName="catId">
            @for (cat of data.categories(); track cat.id) {
              <mat-option [value]="cat.id">{{ cat.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Image -->
        <div class="img-section">
          @if (currentImg()) {
            <img [src]="currentImg()" class="img-preview" />
          } @else {
            <div class="img-placeholder">
              <mat-icon>photo_camera</mat-icon>
            </div>
          }
          <div class="img-actions">
            <button mat-stroked-button type="button" (click)="fileInput.click()">
              <mat-icon>upload</mat-icon> Wybierz zdjęcie
            </button>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>lub wklej URL</mat-label>
              <input matInput formControlName="imgUrl"
                (blur)="onUrlBlur()" placeholder="https://..." />
            </mat-form-field>
          </div>
          <input #fileInput type="file" accept="image/*" style="display:none"
            (change)="onFileChange($event)" />
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nazwa</mat-label>
          <input matInput formControlName="name" placeholder="nazwa produktu..." />
        </mat-form-field>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Cena (zł)</mat-label>
            <input matInput type="number" formControlName="price" placeholder="0.00" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Masa (g)</mat-label>
            <input matInput type="number" formControlName="mass" placeholder="0" />
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

      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Anuluj</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="form.invalid">Zapisz</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .product-form { display: flex; flex-direction: column; gap: 4px; min-width: 300px; }
    .full-width { width: 100%; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .img-section { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 4px; }
    .img-preview { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
    .img-placeholder { width: 80px; height: 80px; border-radius: 8px; background: #f5f5f5;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .img-actions { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    mat-dialog-content { max-height: 70vh; overflow-y: auto; }
  `],
})
export class ProductModalComponent implements OnInit {
  data = inject(DataService);
  private dialogRef = inject(MatDialogRef<ProductModalComponent>);
  dialogData: ProductModalData = inject(MAT_DIALOG_DATA);
  private notify = inject(NotificationService);
  private imgService = inject(ImageService);
  private fb = inject(FormBuilder);

  currentImg = signal<string>('');

  form = this.fb.group({
    catId: ['', Validators.required],
    name: ['', Validators.required],
    price: [0],
    mass: [0],
    imgUrl: [''],
    link: [''],
    desc: [''],
  });

  ngOnInit(): void {
    const p = this.dialogData.product;
    if (p) {
      this.form.patchValue({
        catId: p.catId, name: p.name, price: p.price,
        mass: p.mass, link: p.link, desc: p.desc, imgUrl: '',
      });
      if (p.img) this.currentImg.set(p.img);
    } else if (this.dialogData.defaultCatId) {
      this.form.patchValue({ catId: this.dialogData.defaultCatId });
    } else if (this.data.categories().length > 0) {
      this.form.patchValue({ catId: this.data.categories()[0].id });
    }
  }

  async onFileChange(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const base64 = await this.imgService.resizeAndEncode(file);
    this.currentImg.set(base64);
  }

  onUrlBlur(): void {
    const url = this.form.value.imgUrl?.trim();
    if (url) this.currentImg.set(url);
    else if (!this.dialogData.product?.img) this.currentImg.set('');
  }

  onSave(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    const productData = {
      catId: v.catId!,
      name: v.name!.trim(),
      price: Number(v.price) || 0,
      mass: Number(v.mass) || 0,
      img: this.currentImg(),
      link: v.link?.trim() ?? '',
      desc: v.desc?.trim() ?? '',
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
