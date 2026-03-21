import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Order, OrderRowCalc } from '../../../core/models/catalog.models';
import { DataService } from '../../../core/services/data.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatTableModule, MatIconModule, MatButtonModule,
  ],
  template: `
    <mat-card class="order-card">
      <mat-card-header>
        <mat-card-title [style.color]="order().color.fg">{{ order().name }}</mat-card-title>
        <mat-card-subtitle>
          <span class="badge">{{ order().items.length }} produktów</span>
          <span class="profit-badge" [class.profit-pos]="totalProfit() >= 0" [class.profit-neg]="totalProfit() < 0">
            Zysk: {{ totalProfit() | number:'1.2-2' }} zł
          </span>
        </mat-card-subtitle>
      </mat-card-header>

      <!-- Fee inputs -->
      <div class="fee-inputs">
        <mat-form-field appearance="outline">
          <mat-label>✈ Dostawa (zł)</mat-label>
          <input matInput type="number" [value]="order().delivery"
            (change)="data.updateOrderFee(order().id, 'delivery', +$any($event.target).value)" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>📋 Inne opłaty (zł)</mat-label>
          <input matInput type="number" [value]="order().otherFees"
            (change)="data.updateOrderFee(order().id, 'otherFees', +$any($event.target).value)" />
        </mat-form-field>
      </div>

      <!-- Table -->
      <div class="table-wrap">
        <table mat-table [dataSource]="rows()" class="order-table">
          <ng-container matColumnDef="no">
            <th mat-header-cell *matHeaderCellDef>#</th>
            <td mat-cell *matCellDef="let r; let i = index">{{ i + 1 }}</td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nazwa</th>
            <td mat-cell *matCellDef="let r">{{ r.product.name }}</td>
          </ng-container>
          <ng-container matColumnDef="price">
            <th mat-header-cell *matHeaderCellDef>Cena</th>
            <td mat-cell *matCellDef="let r">{{ r.product.price | number:'1.2-2' }}</td>
          </ng-container>
          <ng-container matColumnDef="mass">
            <th mat-header-cell *matHeaderCellDef>Masa</th>
            <td mat-cell *matCellDef="let r">{{ r.product.mass }}</td>
          </ng-container>
          <ng-container matColumnDef="delivery">
            <th mat-header-cell *matHeaderCellDef>Dostawa</th>
            <td mat-cell *matCellDef="let r">{{ r.deliveryShare | number:'1.2-2' }}</td>
          </ng-container>
          <ng-container matColumnDef="other">
            <th mat-header-cell *matHeaderCellDef>Inne</th>
            <td mat-cell *matCellDef="let r">{{ r.otherFeesShare | number:'1.2-2' }}</td>
          </ng-container>
          <ng-container matColumnDef="cost">
            <th mat-header-cell *matHeaderCellDef>Koszt</th>
            <td mat-cell *matCellDef="let r">{{ r.totalCost | number:'1.2-2' }}</td>
          </ng-container>
          <ng-container matColumnDef="sell">
            <th mat-header-cell *matHeaderCellDef>Sprzedaż 🟢</th>
            <td mat-cell *matCellDef="let r">
              <mat-form-field appearance="outline" class="sell-field">
                <input matInput type="number" [value]="r.item.sellPrice || ''"
                  placeholder="0.00"
                  (change)="data.updateSellPrice(order().id, r.product.id, +$any($event.target).value)" />
              </mat-form-field>
            </td>
          </ng-container>
          <ng-container matColumnDef="profit">
            <th mat-header-cell *matHeaderCellDef>Zysk</th>
            <td mat-cell *matCellDef="let r"
              [class.profit-pos]="r.profit !== null && r.profit >= 0"
              [class.profit-neg]="r.profit !== null && r.profit < 0">
              {{ r.profit !== null ? (r.profit | number:'1.2-2') : '—' }}
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>

      <!-- Stats -->
      <div class="order-stats">
        <div class="stat-cell">
          <div class="stat-label">Zakupy</div>
          <div class="stat-value">{{ totalBuy() | number:'1.2-2' }} zł</div>
        </div>
        <div class="stat-cell">
          <div class="stat-label">Koszt całkowity</div>
          <div class="stat-value">{{ totalCost() | number:'1.2-2' }} zł</div>
        </div>
        <div class="stat-cell">
          <div class="stat-label">Przychód</div>
          <div class="stat-value">{{ totalRevenue() | number:'1.2-2' }} zł</div>
        </div>
        <div class="stat-cell">
          <div class="stat-label">ZYSK</div>
          <div class="stat-value" [class.profit-pos]="totalProfit() >= 0" [class.profit-neg]="totalProfit() < 0">
            {{ totalProfit() | number:'1.2-2' }} zł
          </div>
        </div>
      </div>
    </mat-card>
  `,
  styles: [`
    .order-card { margin: 16px; }
    .fee-inputs { display: flex; gap: 12px; padding: 0 16px; flex-wrap: wrap; }
    .fee-inputs mat-form-field { flex: 1; min-width: 140px; }
    .badge { background: #e8eaf6; color: #3f51b5; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-right: 8px; }
    .profit-badge { font-size: 13px; font-weight: 600; }
    .profit-pos { color: #059669; }
    .profit-neg { color: #dc2626; }
    .table-wrap { overflow-x: auto; }
    .order-table { width: 100%; }
    .sell-field { width: 90px; }
    ::ng-deep .sell-field .mat-mdc-form-field-infix { padding: 4px 0; }
    .order-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #e0e0e0; margin-top: 16px; }
    .stat-cell { background: white; padding: 12px; text-align: center; }
    .stat-label { font-size: 11px; color: rgba(0,0,0,.54); }
    .stat-value { font-size: 15px; font-weight: 600; margin-top: 4px; }
  `],
})
export class OrderDetailComponent {
  order = input.required<Order>();
  data = inject(DataService);

  displayedColumns = ['no', 'name', 'price', 'mass', 'delivery', 'other', 'cost', 'sell', 'profit'];

  rows = computed<OrderRowCalc[]>(() => {
    const ord = this.order();
    const products = this.data.products();
    const totalMass = ord.items.reduce((s, it) => {
      const p = products.find(x => x.id === it.prodId);
      return s + (p?.mass ?? 0);
    }, 0);
    return ord.items
      .map(it => {
        const product = products.find(x => x.id === it.prodId);
        if (!product) return null;
        const massPercent = totalMass > 0 ? (product.mass ?? 0) / totalMass : 0;
        const deliveryShare = (ord.delivery ?? 0) * massPercent;
        const otherFeesShare = ord.items.length > 0 ? (ord.otherFees ?? 0) / ord.items.length : 0;
        const totalCost = (product.price ?? 0) + deliveryShare + otherFeesShare;
        const profit = it.sellPrice > 0 ? it.sellPrice - totalCost : null;
        return { product, item: it, massPercent, deliveryShare, otherFeesShare, totalCost, profit };
      })
      .filter((r): r is OrderRowCalc => r !== null);
  });

  totalBuy = computed(() => this.rows().reduce((s, r) => s + (r.product.price ?? 0), 0));
  totalCost = computed(() => this.rows().reduce((s, r) => s + r.totalCost, 0));
  totalRevenue = computed(() => this.rows().reduce((s, r) => s + (r.item.sellPrice ?? 0), 0));
  totalProfit = computed(() => this.totalRevenue() - this.totalCost());
}
