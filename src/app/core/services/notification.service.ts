import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  notify(msg: string): void {
    this.snackBar.open(msg, undefined, { duration: 2500 });
  }
}
