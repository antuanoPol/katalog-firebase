import { Component, input, inject, computed, signal } from '@angular/core';
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
    <div class="order-card">
      <!-- Header -->
      <div class="order-header">
        <div class="order-title-row">
          <div class="order-dot" [style.background]="order().color.fg"></div>
          <span class="order-name">{{ order().name }}</span>
          <span class="order-badge">{{ order().items.length }} produktów</span>
        </div>
        <div class="profit-chip" [class.positive]="totalProfit() >= 0" [class.negative]="totalProfit() < 0">
          <mat-icon>trending_{{ totalProfit() >= 0 ? 'up' : 'down' }}</mat-icon>
          Zysk: {{ totalProfit() | number:'1.2-2' }} zł
        </div>
      </div>

      <!-- Fee inputs -->
      <!-- Fee inputs row -->
      <div class="fee-inputs">
        <mat-form-field appearance="outline">
          <mat-label>Dostawa (zł)</mat-label>
          <mat-icon matPrefix>flight</mat-icon>
          <input matInput type="number" [value]="order().delivery"
            (focus)="$any($event.target).select()"
            (change)="data.updateOrderFee(order().id, 'delivery', +$any($event.target).value)" />
        </mat-form-field>

        <!-- Custom fees compact button (looks like a form field) -->
        <div class="custom-fees-field" [class.active]="feesExpanded()" (click)="feesExpanded.set(!feesExpanded())">
          <mat-icon class="fees-icon">receipt</mat-icon>
          <div class="fees-field-content">
            <span class="fees-field-label">Dodatkowe opłaty</span>
            <span class="fees-field-value">
              @if (totalCustomFees() > 0) {
                {{ totalCustomFees() | number:'1.2-2' }} zł
              } @else {
                0.00 zł
              }
            </span>
          </div>
          <mat-icon class="fees-chevron">{{ feesExpanded() ? 'expand_less' : 'expand_more' }}</mat-icon>
        </div>
      </div>

      <!-- Custom fees panel (expanded) -->
      @if (feesExpanded()) {
        <div class="fees-panel">
          @for (fee of (order().customFees ?? []); track fee.id) {
            <div class="fee-row">
              <input class="fee-name-input" [value]="fee.name" placeholder="Nazwa opłaty"
                (click)="$event.stopPropagation()"
                (change)="data.updateCustomFee(order().id, fee.id, 'name', $any($event.target).value)" />
              <input class="fee-amount-input" type="number" [value]="fee.amount" min="0" step="0.01"
                (click)="$event.stopPropagation()"
                (focus)="$any($event.target).select()"
                (change)="data.updateCustomFee(order().id, fee.id, 'amount', +$any($event.target).value)" />
              <span class="fee-currency">zł</span>
              <button class="fee-delete-btn" (click)="$event.stopPropagation(); data.removeCustomFee(order().id, fee.id)">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          }
          <button class="add-fee-btn" (click)="$event.stopPropagation(); addFee()">
            <mat-icon>add</mat-icon> Dodaj opłatę
          </button>
        </div>
      }

      <!-- Search & sort toolbar -->
      <div class="table-toolbar">
        <div class="search-box">
          <mat-icon class="search-icon">search</mat-icon>
          <input class="search-input" [value]="searchQuery()"
            (input)="searchQuery.set($any($event.target).value)"
            placeholder="Szukaj produktu..." />
          @if (searchQuery()) {
            <button class="search-clear" (click)="searchQuery.set('')">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>
        <div class="sort-group">
          <button class="sort-btn" [class.active]="sortField() === 'name'" (click)="setSort('name')">
            Nazwa {{ sortField() === 'name' ? (sortDir() === 'asc' ? '↑' : '↓') : '' }}
          </button>
          <button class="sort-btn" [class.active]="sortField() === 'price'" (click)="setSort('price')">
            Cena {{ sortField() === 'price' ? (sortDir() === 'asc' ? '↑' : '↓') : '' }}
          </button>
          <button class="sort-btn" [class.active]="sortField() === 'cost'" (click)="setSort('cost')">
            Koszt {{ sortField() === 'cost' ? (sortDir() === 'asc' ? '↑' : '↓') : '' }}
          </button>
          <button class="sort-btn" [class.active]="sortField() === 'profit'" (click)="setSort('profit')">
            Zysk {{ sortField() === 'profit' ? (sortDir() === 'asc' ? '↑' : '↓') : '' }}
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="table-wrap">
        <table mat-table [dataSource]="filteredRows()" class="order-table">
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
            <td mat-cell *matCellDef="let r" class="price-cell">{{ r.product.price | number:'1.2-2' }}</td>
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
            <th mat-header-cell *matHeaderCellDef>Sprzedaż</th>
            <td mat-cell *matCellDef="let r">
              <mat-form-field appearance="outline" class="sell-field">
                <input matInput type="number" [value]="r.item.sellPrice || ''"
                  placeholder="0.00"
                  (focus)="$any($event.target).select()"
                  (change)="onSellPrice(r.item, +$any($event.target).value)" />
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
          <ng-container matColumnDef="remove">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let r">
              <button mat-icon-button class="remove-btn" (click)="onRemoveItem(r.item)" title="Usuń z zamówienia">
                <mat-icon>remove_circle_outline</mat-icon>
              </button>
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
          <div class="stat-value">{{ totalBuy() | number:'1.2-2' }} <span class="stat-currency">zł</span></div>
        </div>
        <div class="stat-cell">
          <div class="stat-label">Koszt całkowity</div>
          <div class="stat-value">{{ totalCost() | number:'1.2-2' }} <span class="stat-currency">zł</span></div>
        </div>
        <div class="stat-cell">
          <div class="stat-label">Przychód</div>
          <div class="stat-value">{{ totalRevenue() | number:'1.2-2' }} <span class="stat-currency">zł</span></div>
        </div>
        <div class="stat-cell highlight">
          <div class="stat-label">ZYSK</div>
          <div class="stat-value" [class.profit-pos]="totalProfit() >= 0" [class.profit-neg]="totalProfit() < 0">
            {{ totalProfit() | number:'1.2-2' }} <span class="stat-currency">zł</span>
          </div>
        </div>
        <div class="stat-cell">
          <div class="stat-label">MASA PACZKI</div>
          <div class="stat-value">
            {{ totalMass() >= 1000 ? (totalMass() / 1000 | number:'1.2-2') : totalMass() }}
            <span class="stat-currency">{{ totalMass() >= 1000 ? 'kg' : 'g' }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .order-card { margin: 16px; border-radius: var(--radius); overflow: hidden; background: var(--surface); border: 1px solid var(--border); animation: fadeUp .4s ease both; }
    .order-header { padding: 16px 16px 12px; border-bottom: 1px solid var(--border); }
    .order-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .order-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .order-name { font-weight: 700; font-size: 16px; color: var(--text); flex: 1; }
    .order-badge {
      background: var(--surface-2); border: 1px solid var(--border); border-radius: 20px;
      padding: 3px 10px; font-size: 11px; color: var(--text-muted); font-weight: 600;
    }
    .profit-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700;
    }
    .profit-chip mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .profit-chip.positive { background: rgba(74,222,128,.12); color: #4ade80; border: 1px solid rgba(74,222,128,.25); }
    .profit-chip.negative { background: rgba(244,63,94,.12); color: #f43f5e; border: 1px solid rgba(244,63,94,.25); }
    .fee-inputs { display: flex; gap: 12px; padding: 12px 16px; flex-wrap: wrap; border-bottom: 1px solid var(--border); }
    .fee-inputs mat-form-field { flex: 1; min-width: 140px; }
    .custom-fees-field {
      flex: 1; min-width: 140px;
      display: flex; align-items: center; gap: 10px;
      border: 1px solid var(--border); border-radius: 4px;
      padding: 0 12px; height: 56px; cursor: pointer;
      background: transparent; transition: border-color .2s;
    }
    .custom-fees-field:hover { border-color: var(--text-muted); }
    .custom-fees-field.active { border-color: var(--primary); }
    .fees-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted); flex-shrink: 0; }
    .fees-field-content { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .fees-field-label { font-size: 11px; color: var(--text-muted); line-height: 1.2; }
    .fees-field-value { font-size: 16px; font-weight: 500; color: var(--text); }
    .fees-chevron { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted); flex-shrink: 0; }
    .fees-panel { padding: 10px 16px 14px; border-bottom: 1px solid var(--border); background: var(--surface-2); }
    .fee-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
    .fee-name-input { flex: 1; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; color: var(--text); font-size: 13px; font-family: inherit; outline: none; transition: border-color .2s; min-width: 0; }
    .fee-name-input:focus { border-color: var(--border-amber); }
    .fee-amount-input { width: 80px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 6px 8px; color: var(--primary); font-size: 13px; font-weight: 700; font-family: inherit; outline: none; text-align: right; transition: border-color .2s; }
    .fee-amount-input:focus { border-color: var(--border-amber); }
    .fee-currency { font-size: 12px; color: var(--text-muted); flex-shrink: 0; }
    .fee-delete-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; padding: 2px; border-radius: 50%; transition: color .2s; }
    .fee-delete-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .fee-delete-btn:hover { color: #f43f5e; }
    .add-fee-btn { display: flex; align-items: center; gap: 4px; margin-top: 6px; padding: 4px 10px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .2s; }
    .add-fee-btn mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .add-fee-btn:hover { border-color: var(--primary); color: var(--primary); }
    .table-toolbar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; flex-wrap: wrap; border-bottom: 1px solid var(--border); }
    .search-box {
      display: flex; align-items: center; gap: 6px;
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 10px; padding: 0 10px; height: 34px;
      flex: 1; min-width: 140px; max-width: 260px; transition: border-color .2s;
    }
    .search-box:focus-within { border-color: var(--border-amber); }
    .search-icon { font-size: 16px; width: 16px; height: 16px; color: var(--text-muted); }
    .search-input { flex: 1; background: none; border: none; outline: none; color: var(--text); font-size: 13px; font-family: inherit; }
    .search-clear { background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; color: var(--text-muted); }
    .search-clear mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .sort-group { display: flex; gap: 4px; }
    .sort-btn { padding: 5px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-muted); font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .2s; }
    .sort-btn.active { border-color: var(--border-amber); color: var(--primary); background: rgba(255,193,7,.08); }
    .sort-btn:hover { border-color: var(--border-amber); color: var(--primary); }
    .table-wrap { overflow-x: auto; }
    .order-table { width: 100%; }
    .sell-field { width: 88px; }
    ::ng-deep .sell-field .mat-mdc-form-field-infix { padding: 4px 0; min-height: unset; }
    .price-cell { color: var(--primary) !important; font-weight: 600; }
    .profit-pos { color: #4ade80 !important; font-weight: 700; }
    .profit-neg { color: #f43f5e !important; font-weight: 700; }
    .order-stats { display: grid; grid-template-columns: repeat(5, 1fr); border-top: 1px solid var(--border); }
    .stat-cell { padding: 14px 12px; text-align: center; border-right: 1px solid var(--border); transition: background .2s; }
    .stat-cell:last-child { border-right: none; }
    .stat-cell:hover { background: var(--surface-2); }
    .stat-cell.highlight { background: rgba(255,193,7,.05); }
    .stat-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .1em; font-weight: 700; }
    .stat-value { font-size: 15px; font-weight: 700; margin-top: 5px; color: var(--text); }
    .stat-currency { font-size: 11px; font-weight: 400; color: var(--text-muted); }
    .remove-btn { color: var(--danger, #f43f5e) !important; opacity: .5; transition: opacity .2s; }
    .remove-btn:hover { opacity: 1; }
  `],
})
export class OrderDetailComponent {
  order = input.required<Order>();
  data = inject(DataService);
  searchQuery = signal('');
  sortField = signal<'name' | 'price' | 'cost' | 'profit'>('name');
  sortDir = signal<'asc' | 'desc'>('asc');
  feesExpanded = signal(false);

  setSort(field: 'name' | 'price' | 'cost' | 'profit'): void {
    if (this.sortField() === field) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
  }

  displayedColumns = ['no', 'name', 'price', 'mass', 'delivery', 'other', 'cost', 'sell', 'profit', 'remove'];

  totalCustomFees = computed(() => {
    const fees = this.order().customFees;
    if (fees !== undefined) return fees.reduce((s, f) => s + (f.amount ?? 0), 0);
    return this.order().otherFees ?? 0; // backward compat for old orders
  });

  addFee(): void {
    this.data.addCustomFee(this.order().id, 'Opłata', 0);
  }

  rows = computed<OrderRowCalc[]>(() => {
    const ord = this.order();
    const products = this.data.products();
    const totalMass = ord.items.reduce((s, it) => {
      const p = products.find(x => x.id === it.prodId);
      return s + (p?.mass ?? 0);
    }, 0);
    const effectiveOtherFees = this.totalCustomFees();
    return ord.items
      .map(it => {
        const product = products.find(x => x.id === it.prodId);
        if (!product) return null;
        const massPercent = totalMass > 0 ? (product.mass ?? 0) / totalMass : 0;
        const deliveryShare = (ord.delivery ?? 0) * massPercent;
        const otherFeesShare = ord.items.length > 0 ? effectiveOtherFees / ord.items.length : 0;
        const totalCost = (product.price ?? 0) + deliveryShare + otherFeesShare;
        const profit = it.sellPrice > 0 ? it.sellPrice - totalCost : null;
        return { product, item: it, massPercent, deliveryShare, otherFeesShare, totalCost, profit };
      })
      .filter((r): r is OrderRowCalc => r !== null);
  });

  filteredRows = computed(() => {
    const q = this.searchQuery().toLowerCase();
    let result = q ? this.rows().filter(r => r.product.name.toLowerCase().includes(q)) : this.rows();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return [...result].sort((a, b) => {
      switch (this.sortField()) {
        case 'name':   return dir * a.product.name.localeCompare(b.product.name);
        case 'price':  return dir * (a.product.price - b.product.price);
        case 'cost':   return dir * (a.totalCost - b.totalCost);
        case 'profit': return dir * ((a.profit ?? -Infinity) - (b.profit ?? -Infinity));
      }
    });
  });

  onSellPrice(item: import('../../../core/models/catalog.models').OrderItem, value: number): void {
    this.data.updateSellPrice(this.order().id, item.itemId ?? item.prodId, value);
  }

  onRemoveItem(item: import('../../../core/models/catalog.models').OrderItem): void {
    this.data.removeOrderItem(this.order().id, item.itemId ?? item.prodId);
  }

  totalMass = computed(() => this.rows().reduce((s, r) => s + (r.product.mass ?? 0), 0));
  totalBuy = computed(() => this.rows().reduce((s, r) => s + (r.product.price ?? 0), 0));
  totalCost = computed(() => this.rows().reduce((s, r) => s + r.totalCost, 0));
  totalRevenue = computed(() => this.rows().reduce((s, r) => s + (r.item.sellPrice ?? 0), 0));
  totalProfit = computed(() => this.totalRevenue() - this.totalCost());
}
