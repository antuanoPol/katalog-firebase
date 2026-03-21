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
        <div class="empty-icon-wrap">
          <mat-icon>local_shipping</mat-icon>
        </div>
        <p class="empty-title">Brak zamówień</p>
        <p class="empty-sub">Wróć do katalogu i kliknij "Do paczki"</p>
      </div>
    } @else {
      <div class="orders-toolbar">
        <div class="orders-title-row">
          <mat-icon class="orders-icon">local_shipping</mat-icon>
          <span class="orders-title">Zamówienia</span>
          <span class="order-count-chip">{{ data.orders().length }}</span>
        </div>
        <div class="orders-controls">
          <mat-form-field appearance="outline" class="order-select">
            <mat-label>Wybierz zamówienie</mat-label>
            <mat-select [value]="selectedOrderId()" (valueChange)="selectedOrderId.set($event)">
              @for (order of data.orders(); track order.id) {
                <mat-option [value]="order.id">
                  {{ order.name }} <span class="opt-count">({{ order.items.length }})</span>
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
          <div class="header-actions">
            @if (selectedOrderId()) {
              <button mat-icon-button (click)="onDelete()" title="Usuń zamówienie" class="btn-danger">
                <mat-icon>delete</mat-icon>
              </button>
            }
            <button mat-icon-button routerLink="/panel" title="Panel statystyk" class="btn-panel">
              <mat-icon>bar_chart</mat-icon>
            </button>
          </div>
        </div>
      </div>

      @if (selectedOrder()) {
        <app-order-detail [order]="selectedOrder()!" />
      }
    }
  `,
  styles: [`
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 80px 24px; gap: 8px;
      animation: fadeIn .5s ease;
    }
    .empty-icon-wrap {
      width: 80px; height: 80px; border-radius: 24px;
      background: var(--surface-2); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center; margin-bottom: 8px;
    }
    .empty-icon-wrap mat-icon { font-size: 36px; width: 36px; height: 36px; color: var(--text-muted); }
    .empty-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--text); }
    .empty-sub { margin: 0; font-size: 13px; color: var(--text-muted); text-align: center; }
    .orders-toolbar {
      position: sticky; top: 0; z-index: 9;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 10px 16px 0;
      animation: fadeUp .3s ease;
    }
    .orders-title-row {
      display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
    }
    .orders-icon { font-size: 18px; width: 18px; height: 18px; color: var(--primary); }
    .orders-title {
      font-size: 12px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .1em; color: var(--text-muted);
    }
    .order-count-chip {
      font-size: 11px; font-weight: 700; color: var(--primary);
      background: var(--primary-glow); border: 1px solid var(--border-amber);
      padding: 2px 9px; border-radius: 20px; letter-spacing: .04em;
    }
    .orders-controls {
      display: flex; align-items: flex-start; gap: 8px;
    }
    .order-select { flex: 1; }
    .header-actions { display: flex; align-items: center; padding-top: 4px; }
    .btn-danger { color: var(--danger) !important; }
    .btn-panel { color: var(--primary) !important; }
    .opt-count { color: var(--text-muted); font-size: 11px; }
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
