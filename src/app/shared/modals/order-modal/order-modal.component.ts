import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../../../core/services/data.service';
import { NotificationService } from '../../../core/services/notification.service';

export interface OrderModalData {
  selectedIds: string[];
}

@Component({
  selector: 'app-order-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Nowe zamówienie</h2>
    <mat-dialog-content>
      <p class="selection-info">Zaznaczono: {{ dialogData.selectedIds.length }} produktów</p>
      <form [formGroup]="form" (ngSubmit)="onSave()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nazwa zamówienia</mat-label>
          <input matInput formControlName="name"
            placeholder="np. Vinted Marzec..."
            (keydown.enter)="onSave()" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Anuluj</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="form.invalid">Utwórz</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; min-width: 280px; }
    .selection-info { color: rgba(0,0,0,.6); font-size: 13px; margin-bottom: 8px; }
  `],
})
export class OrderModalComponent {
  private dialogRef = inject(MatDialogRef<OrderModalComponent>);
  dialogData: OrderModalData = inject(MAT_DIALOG_DATA);
  private data = inject(DataService);
  private notify = inject(NotificationService);
  private fb = inject(FormBuilder);

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
}
