import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import { OrderDetailComponent } from './order-detail/order-detail.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/modals/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatSelectModule, MatFormFieldModule,
    MatButtonModule, MatIconModule, OrderDetailComponent,
  ],
  template: `
    @if (data.orders().length === 0) {
      <div class="empty-state">
        <mat-icon class="empty-icon">local_shipping</mat-icon>
        <p>Brak zamówień. Wróć do katalogu i kliknij "Do paczki".</p>
      </div>
    } @else {
      <div class="orders-header">
        <mat-form-field appearance="outline" class="order-select">
          <mat-label>Wybierz zamówienie</mat-label>
          <mat-select [value]="selectedOrderId()" (valueChange)="selectedOrderId.set($event)">
            @for (order of data.orders(); track order.id) {
              <mat-option [value]="order.id">{{ order.name }} ({{ order.items.length }})</mat-option>
            }
          </mat-select>
        </mat-form-field>
        @if (selectedOrderId()) {
          <button mat-icon-button color="warn" (click)="onDelete()" title="Usuń zamówienie">
            <mat-icon>delete</mat-icon>
          </button>
        }
        <button mat-icon-button routerLink="/panel" title="Panel statystyk">
          <mat-icon>bar_chart</mat-icon>
        </button>
      </div>

      @if (selectedOrder()) {
        <app-order-detail [order]="selectedOrder()!" />
      }
    }
  `,
  styles: [`
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 80px 24px; color: var(--text-muted);
    }
    .empty-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 16px; opacity: .2; }
    .orders-header {
      display: flex; align-items: center; gap: 8px;
      padding: 16px 16px 0;
    }
    .order-select { flex: 1; }
  `],
})
export class OrdersComponent {
  data = inject(DataService);
  private notify = inject(NotificationService);
  private dialog = inject(MatDialog);

  selectedOrderId = signal('');

  selectedOrder = computed(() =>
    this.data.orders().find(o => o.id === this.selectedOrderId()) ?? null
  );

  onDelete(): void {
    const order = this.selectedOrder();
    if (!order) return;
    const data: ConfirmDialogData = { message: `Usunąć zamówienie "${order.name}"?` };
    this.dialog.open(ConfirmDialogComponent, { width: '320px', data })
      .afterClosed().subscribe(ok => {
        if (ok) { this.data.deleteOrder(order.id); this.selectedOrderId.set(''); this.notify.notify('Usunięto'); }
      });
  }
}
