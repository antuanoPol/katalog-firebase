import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <header class="topbar">
      <div class="topbar-brand">
        <div class="brand-icon">
          <mat-icon>inventory_2</mat-icon>
        </div>
        <span class="brand-name">Katalog</span>
      </div>

      <div class="topbar-right">
        <div class="sync-dot" [class]="'sync-' + data.syncState()" [title]="syncTitle()">
          <mat-icon class="sync-icon">{{ syncIcon() }}</mat-icon>
        </div>
        <button class="avatar-btn" [matMenuTriggerFor]="userMenu">
          <span class="avatar-letter">{{ avatarLetter() }}</span>
        </button>
      </div>

      <mat-menu #userMenu="matMenu" xPosition="before">
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
    </header>
    <input #fileInput type="file" accept=".json" style="display:none" (change)="onImportFile($event)" />
  `,
  styles: [`
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 16px; height: 60px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 100;
      animation: fadeUp .3s ease;
    }
    .topbar-brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon {
      width: 36px; height: 36px; border-radius: 10px;
      background: var(--primary); display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 16px rgba(255,193,7,.35);
    }
    .brand-icon mat-icon { color: #12121f; font-size: 20px; width: 20px; height: 20px; }
    .brand-name { font-weight: 700; font-size: 17px; letter-spacing: .02em; color: var(--text); }
    .topbar-right { display: flex; align-items: center; gap: 10px; }
    .sync-dot {
      display: flex; align-items: center; gap: 5px;
      padding: 4px 10px; border-radius: 20px;
      background: var(--surface-2); border: 1px solid var(--border);
      font-size: 11px; font-weight: 600; letter-spacing: .04em;
    }
    .sync-icon { font-size: 14px; width: 14px; height: 14px; }
    .sync-online  { border-color: rgba(74,222,128,.3); color: #4ade80; }
    .sync-online .sync-icon { color: #4ade80; }
    .sync-syncing { border-color: rgba(255,193,7,.3); color: var(--primary); }
    .sync-syncing .sync-icon { color: var(--primary); animation: spin .7s linear infinite; }
    .sync-offline { border-color: rgba(244,63,94,.3); color: #f43f5e; }
    .sync-offline .sync-icon { color: #f43f5e; animation: pulse .8s infinite alternate; }
    .avatar-btn {
      width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--border-amber);
      background: var(--primary-glow); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: border-color .2s, box-shadow .2s;
    }
    .avatar-btn:hover { border-color: var(--primary); box-shadow: 0 0 12px rgba(255,193,7,.3); }
    .avatar-letter { font-weight: 700; font-size: 14px; color: var(--primary); }
    .menu-email { padding: 10px 16px 8px; font-size: 11px; color: var(--text-muted); border-bottom: 1px solid var(--border); }
    .logout-item { color: var(--danger) !important; }
    .logout-item mat-icon { color: var(--danger) !important; }
  `],
})
export class TopbarComponent {
  auth = inject(AuthService);
  data = inject(DataService);
  private dialog = inject(MatDialog);

  avatarLetter() {
    return (this.auth.user()?.email?.[0] ?? '?').toUpperCase();
  }

  syncTitle() {
    const map: Record<string, string> = {
      online: 'Zsynchronizowano', syncing: 'Zapisywanie...', offline: 'Offline'
    };
    return map[this.data.syncState()] ?? '';
  }

  syncIcon() {
    const map: Record<string, string> = {
      online: 'cloud_done', syncing: 'sync', offline: 'cloud_off'
    };
    return map[this.data.syncState()] ?? 'cloud';
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
