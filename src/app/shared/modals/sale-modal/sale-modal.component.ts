import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../../../core/services/data.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Product, Order } from '../../../core/models/catalog.models';

const PLATFORMS = ['Vinted', 'Allegro', 'OLX', 'Szafa.pl', 'Depop', 'Inne'];

interface CostBreakdown {
  purchasePrice: number;
  deliveryShare: number;
  otherFeesShare: number;
  totalCost: number;
  orderName: string | null;
}

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
          <mat-select formControlName="productId" (selectionChange)="onProductChange($event.value)">
            @for (p of data.products(); track p.id) {
              <mat-option [value]="p.id">{{ p.name }} ({{ p.price | number:'1.2-2' }} zł)</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Cost breakdown from order -->
        @if (breakdown()) {
          <div class="breakdown-card">
            @if (breakdown()!.orderName) {
              <div class="breakdown-order">
                <span class="bd-icon">📦</span> Koszty z zamówienia: <strong>{{ breakdown()!.orderName }}</strong>
              </div>
            }
            <div class="breakdown-rows">
              <div class="bd-row">
                <span>Cena zakupu</span>
                <span>{{ breakdown()!.purchasePrice | number:'1.2-2' }} zł</span>
              </div>
              @if (breakdown()!.deliveryShare > 0) {
                <div class="bd-row">
                  <span>Udział w dostawie</span>
                  <span>{{ breakdown()!.deliveryShare | number:'1.2-2' }} zł</span>
                </div>
              }
              @if (breakdown()!.otherFeesShare > 0) {
                <div class="bd-row">
                  <span>Inne opłaty</span>
                  <span>{{ breakdown()!.otherFeesShare | number:'1.2-2' }} zł</span>
                </div>
              }
              <div class="bd-row total">
                <span>Łączny koszt</span>
                <span>{{ breakdown()!.totalCost | number:'1.2-2' }} zł</span>
              </div>
            </div>
          </div>
        }

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

        <!-- Profit preview -->
        @if (form.value.sellPrice && breakdown()) {
          <div class="profit-preview" [class.negative]="profitPreview() < 0">
            Szacowany zysk: <strong>{{ profitPreview() | number:'1.2-2' }} zł</strong>
          </div>
        }

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
    .sale-form { display: flex; flex-direction: column; gap: 4px; min-width: 300px; }
    .full-width { width: 100%; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    mat-dialog-content { max-height: 70vh; }
    .breakdown-card {
      background: var(--surface-2, #1e1e2e); border: 1px solid var(--border, #2a2a3a);
      border-radius: 10px; padding: 12px; margin-bottom: 4px;
    }
    .breakdown-order { font-size: 12px; color: var(--text-muted, #888); margin-bottom: 8px; }
    .bd-icon { margin-right: 4px; }
    .breakdown-rows { display: flex; flex-direction: column; gap: 4px; }
    .bd-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--text, #fff); }
    .bd-row.total { border-top: 1px solid var(--border, #2a2a3a); padding-top: 6px; margin-top: 2px; font-weight: 700; color: var(--primary, #ffc107); }
    .profit-preview {
      padding: 8px 12px; border-radius: 8px;
      background: rgba(74,222,128,.1); border: 1px solid rgba(74,222,128,.3);
      font-size: 13px; color: #4ade80; margin-bottom: 4px;
    }
    .profit-preview.negative { background: rgba(244,63,94,.1); border-color: rgba(244,63,94,.3); color: #f43f5e; }
  `],
})
export class SaleModalComponent implements OnInit {
  data = inject(DataService);
  private dialogRef = inject(MatDialogRef<SaleModalComponent>);
  private notify = inject(NotificationService);
  private fb = inject(FormBuilder);

  platforms = PLATFORMS;
  breakdown = signal<CostBreakdown | null>(null);

  form = this.fb.group({
    productId: ['', Validators.required],
    sellPrice: [0, [Validators.required, Validators.min(0.01)]],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    platform: ['Vinted', Validators.required],
  });

  ngOnInit(): void {
    const first = this.data.products()[0];
    if (first) {
      this.form.patchValue({ productId: first.id });
      this.computeBreakdown(first.id);
    }
  }

  onProductChange(productId: string): void {
    this.computeBreakdown(productId);
  }

  profitPreview(): number {
    const sell = Number(this.form.value.sellPrice) || 0;
    return sell - (this.breakdown()?.totalCost ?? 0);
  }

  private computeBreakdown(productId: string): void {
    const product = this.data.products().find(p => p.id === productId);
    if (!product) { this.breakdown.set(null); return; }

    // Find the first order containing this product
    const order = this.data.orders().find(o => o.items.some(it => it.prodId === productId));

    if (!order) {
      this.breakdown.set({
        purchasePrice: product.price,
        deliveryShare: 0,
        otherFeesShare: 0,
        totalCost: product.price,
        orderName: null,
      });
      return;
    }

    // Compute shares exactly as OrderDetailComponent does
    const orderProducts = order.items
      .map(it => this.data.products().find(p => p.id === it.prodId))
      .filter((p): p is Product => !!p);

    const totalMass = orderProducts.reduce((s, p) => s + (p.mass || 0), 0);
    const massRatio = totalMass > 0 ? (product.mass || 0) / totalMass : 0;
    const deliveryShare = order.delivery * massRatio;
    const otherFeesShare = order.items.length > 0 ? order.otherFees / order.items.length : 0;
    const totalCost = product.price + deliveryShare + otherFeesShare;

    this.breakdown.set({
      purchasePrice: product.price,
      deliveryShare,
      otherFeesShare,
      totalCost,
      orderName: order.name,
    });
  }

  onSave(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    const product = this.data.products().find(p => p.id === v.productId!);
    if (!product) return;
    const bd = this.breakdown();
    this.data.addSale({
      productId: product.id,
      productName: product.name,
      productCost: bd?.totalCost ?? product.price,
      sellPrice: Number(v.sellPrice) || 0,
      date: v.date!,
      platform: v.platform!,
    });
    this.notify.notify('Sprzedaż dodana');
    this.dialogRef.close(true);
  }
}
