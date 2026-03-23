import { Component, inject, HostListener, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="ref.close(false)">{{ data.cancelLabel ?? 'Anuluj' }}</button>
      <button mat-raised-button color="warn" (click)="ref.close(true)">{{ data.confirmLabel ?? 'Usuń' }}</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent implements OnInit {
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  ref = inject(MatDialogRef<ConfirmDialogComponent>);

  ngOnInit(): void { history.pushState(null, ''); }

  @HostListener('window:popstate')
  onPopState(): void { this.ref.close(false); }
}
