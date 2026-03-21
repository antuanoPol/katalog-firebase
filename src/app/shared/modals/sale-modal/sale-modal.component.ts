import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../../../core/services/data.service';
import { NotificationService } from '../../../core/services/notification.service';

const PLATFORMS = ['Vinted', 'Allegro', 'OLX', 'Szafa.pl', 'Depop', 'Inne'];

@Component({
  selector: 'app-sale-modal',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Dodaj sprzedaż</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="sale-form">

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Produkt</mat-label>
          <mat-select formControlName="productId">
            @for (p of data.products(); track p.id) {
              <mat-option [value]="p.id">{{ p.name }} ({{ p.price | number:'1.2-2' }} zł)</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Cena sprzedaży (zł)</mat-label>
            <input matInput type="number" formControlName="sellPrice" placeholder="0.00" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Data</mat-label>
            <input matInput type="date" formControlName="date" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Transport + cło (zł)</mat-label>
          <input matInput type="number" formControlName="extraCosts" placeholder="0.00" />
          <mat-hint>Koszty transportu i opłat celnych przy zakupie</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Platforma</mat-label>
          <mat-select formControlName="platform">
            @for (pl of platforms; track pl) {
              <mat-option [value]="pl">{{ pl }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Anuluj</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="form.invalid">Zapisz</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .sale-form { display: flex; flex-direction: column; gap: 4px; min-width: 280px; }
    .full-width { width: 100%; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    mat-dialog-content { max-height: 70vh; }
  `],
})
export class SaleModalComponent implements OnInit {
  data = inject(DataService);
  private dialogRef = inject(MatDialogRef<SaleModalComponent>);
  private notify = inject(NotificationService);
  private fb = inject(FormBuilder);

  platforms = PLATFORMS;

  form = this.fb.group({
    productId: ['', Validators.required],
    sellPrice: [0, [Validators.required, Validators.min(0.01)]],
    extraCosts: [0],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    platform: ['Vinted', Validators.required],
  });

  ngOnInit(): void {
    if (this.data.products().length > 0) {
      this.form.patchValue({ productId: this.data.products()[0].id });
    }
  }

  onSave(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    const product = this.data.products().find(p => p.id === v.productId!);
    if (!product) return;
    this.data.addSale({
      productId: product.id,
      productName: product.name,
      productCost: product.price,
      extraCosts: Number(v.extraCosts) || 0,
      sellPrice: Number(v.sellPrice) || 0,
      date: v.date!,
      platform: v.platform!,
    });
    this.notify.notify('Sprzedaż dodana');
    this.dialogRef.close(true);
  }
}
