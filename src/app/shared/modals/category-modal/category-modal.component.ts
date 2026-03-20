import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../../../core/services/data.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-category-modal',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Nowa kategoria</h2>
    <mat-dialog-content>
      <form [formGroup]="form" (ngSubmit)="onSave()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nazwa</mat-label>
          <input matInput formControlName="name"
            placeholder="np. Ciuchy, Lego..."
            (keydown.enter)="onSave()" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Anuluj</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="form.invalid">Dodaj</button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; } mat-dialog-content { min-width: 280px; }`],
})
export class CategoryModalComponent {
  private dialogRef = inject(MatDialogRef<CategoryModalComponent>);
  private data = inject(DataService);
  private notify = inject(NotificationService);
  private fb = inject(FormBuilder);

  form = this.fb.group({ name: ['', Validators.required] });

  onSave(): void {
    if (this.form.invalid) return;
    const name = this.form.value.name!.trim();
    const exists = this.data.categories().some(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) { this.notify.notify('Kategoria już istnieje'); return; }
    this.data.addCategory(name);
    this.notify.notify(`"${name}" dodana`);
    this.dialogRef.close();
  }
}
