import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/services/auth.service';
import { DataService } from '../../../core/services/data.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../modals/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <mat-toolbar color="primary">
      <span class="toolbar-title">
        <mat-icon>inventory_2</mat-icon>
        Katalog
      </span>
      <span class="spacer"></span>
      <span class="sync-indicator" [title]="syncTitle()">
        <mat-icon [class]="'sync-icon sync-' + data.syncState()">
          {{ syncIcon() }}
        </mat-icon>
      </span>
      <button mat-icon-button [matMenuTriggerFor]="userMenu">
        <mat-icon>account_circle</mat-icon>
      </button>
      <mat-menu #userMenu="matMenu">
        <div class="menu-email">{{ auth.user()?.email }}</div>
        <button mat-menu-item (click)="data.exportJson()">
          <mat-icon>save</mat-icon> Backup JSON
        </button>
        <button mat-menu-item (click)="triggerImport()">
          <mat-icon>upload</mat-icon> Import JSON
        </button>
        <button mat-menu-item (click)="data.exportXlsx()">
          <mat-icon>table_chart</mat-icon> Eksportuj XLSX
        </button>
        <button mat-menu-item (click)="auth.logout()" class="logout-item">
          <mat-icon>logout</mat-icon> Wyloguj się
        </button>
      </mat-menu>
    </mat-toolbar>
    <input #fileInput type="file" accept=".json" style="display:none"
      (change)="onImportFile($event)" />
  `,
  styles: [`
    mat-toolbar { position: sticky; top: 0; z-index: 100; }
    .toolbar-title { display: flex; align-items: center; gap: 8px; font-weight: 600; }
    .spacer { flex: 1; }
    .sync-indicator { display: flex; align-items: center; margin-right: 4px; }
    .sync-icon { font-size: 18px; width: 18px; height: 18px; }
    .sync-online { color: #4ade80; }
    .sync-syncing { color: #fbbf24; animation: pulse 0.8s infinite alternate; }
    .sync-offline { color: #f87171; }
    .menu-email { padding: 8px 16px; font-size: 12px; color: rgba(0,0,0,.54); border-bottom: 1px solid #e0e0e0; }
    .logout-item { color: #dc2626; }
    @keyframes pulse { from { opacity: 1; } to { opacity: 0.4; } }
  `],
})
export class TopbarComponent {
  auth = inject(AuthService);
  data = inject(DataService);
  private dialog = inject(MatDialog);

  syncTitle() {
    const map = { online: 'Połączono z chmurą', syncing: 'Synchronizacja...', offline: 'Brak połączenia' };
    return map[this.data.syncState()];
  }

  syncIcon() {
    const map = { online: 'cloud_done', syncing: 'sync', offline: 'cloud_off' };
    return map[this.data.syncState()];
  }

  triggerImport(): void {
    const el = document.querySelector('app-topbar input[type=file]') as HTMLInputElement;
    el?.click();
  }

  onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const data: ConfirmDialogData = { message: 'Zastąpić bieżące dane importem?', confirmLabel: 'Importuj' };
    this.dialog.open(ConfirmDialogComponent, { width: '320px', data })
      .afterClosed().subscribe(ok => { if (ok) this.data.importJson(file); });
    input.value = '';
  }
}
