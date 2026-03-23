import { Component, inject, signal, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../../../core/services/data.service';
import { NotificationService } from '../../../core/services/notification.service';

export interface OrderModalData {
  selectedIds: string[];
}

@Component({
  selector: 'app-order-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ mode() === 'new' ? 'Nowe zamówienie' : 'Dodaj do zamówienia' }}</h2>
    <mat-dialog-content>
      <p class="selection-info">Zaznaczono: {{ dialogData.selectedIds.length }} produktów</p>

      @if (data.orders().length > 0) {
        <div class="mode-toggle">
          <button class="mode-btn" [class.active]="mode() === 'new'" (click)="mode.set('new')">Nowe zamówienie</button>
          <button class="mode-btn" [class.active]="mode() === 'existing'" (click)="mode.set('existing')">Dodaj do istniejącego</button>
        </div>
      }

      @if (mode() === 'new') {
        <form [formGroup]="form" (ngSubmit)="onSave()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nazwa zamówienia</mat-label>
            <input matInput formControlName="name"
              placeholder="np. Vinted Marzec..."
              (keydown.enter)="onSave()" />
          </mat-form-field>
        </form>
      } @else {
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Wybierz zamówienie</mat-label>
          <mat-select [(value)]="selectedOrderId">
            @for (order of data.orders(); track order.id) {
              <mat-option [value]="order.id">{{ order.name }} ({{ order.items.length }} szt.)</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button color="primary" mat-dialog-close>Anuluj</button>
      @if (mode() === 'new') {
        <button mat-raised-button color="primary" (click)="onSave()" [disabled]="form.invalid">Utwórz</button>
      } @else {
        <button mat-raised-button color="primary" (click)="onAddToExisting()" [disabled]="!selectedOrderId">Dodaj</button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; min-width: 280px; }
    .selection-info { color: rgba(0,0,0,.6); font-size: 13px; margin-bottom: 8px; }
    .mode-toggle { display: flex; gap: 6px; margin-bottom: 14px; }
    .mode-btn {
      flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid #ccc;
      background: transparent; font-size: 12px; font-weight: 600; cursor: pointer;
      font-family: inherit; transition: all .2s;
    }
    .mode-btn.active { border-color: #7c3aed; background: rgba(124,58,237,.1); color: #7c3aed; }
  `],
})
export class OrderModalComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<OrderModalComponent>);
  dialogData: OrderModalData = inject(MAT_DIALOG_DATA);
  data = inject(DataService);
  private notify = inject(NotificationService);
  private fb = inject(FormBuilder);

  ngOnInit(): void { history.pushState(null, ''); }

  @HostListener('window:popstate')
  onPopState(): void { this.dialogRef.close(); }

  mode = signal<'new' | 'existing'>(this.data.orders().length === 0 ? 'new' : 'new');
  selectedOrderId = '';

  form = this.fb.group({
    name: [this.defaultName(), Validators.required],
  });

  private defaultName(): string {
    const now = new Date();
    return `Zamówienie ${now.toLocaleDateString('pl-PL')}`;
  }

  onSave(): void {
    if (this.form.invalid) return;
    const name = this.form.value.name!.trim();
    this.data.addOrder(name, this.dialogData.selectedIds);
    this.notify.notify(`"${name}" utworzone!`);
    this.dialogRef.close(true);
  }

  onAddToExisting(): void {
    if (!this.selectedOrderId) return;
    const order = this.data.orders().find(o => o.id === this.selectedOrderId);
    this.data.addProductsToOrder(this.selectedOrderId, this.dialogData.selectedIds);
    this.notify.notify(`Dodano do "${order?.name}"`);
    this.dialogRef.close(true);
  }
}
