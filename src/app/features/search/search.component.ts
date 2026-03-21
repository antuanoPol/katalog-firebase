import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../core/services/notification.service';

const UUFINDS_TOKEN_KEY = 'uufinds_token';
const API = 'https://api.uufinds.com';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="search-page">
      <div class="search-header">
        <h2 class="page-title">Wyszukiwanie obrazem</h2>
        <p class="page-subtitle">Wrzuć zdjęcie produktu — otworzymy obie strony jednocześnie</p>
      </div>

      <!-- uufinds connection card -->
      <div class="connect-card" [class.connected]="uufindsToken()">
        <div class="connect-header">
          <div class="connect-logo">UU</div>
          <div class="connect-info">
            <div class="connect-title">uufinds.com</div>
            @if (uufindsToken()) {
              <div class="connect-status ok"><mat-icon>check_circle</mat-icon> Połączono — automatyczne wyszukiwanie</div>
            } @else {
              <div class="connect-status warn"><mat-icon>link_off</mat-icon> Brak połączenia — tylko schowek</div>
            }
          </div>
          @if (uufindsToken()) {
            <button class="text-btn danger" (click)="disconnect()">Odłącz</button>
          } @else if (!showConnect()) {
            <button class="text-btn primary" (click)="startGoogleLogin()" [disabled]="isLoadingOAuth()">
              @if (isLoadingOAuth()) { <mat-icon class="spin-sm">sync</mat-icon> } Połącz
            </button>
          }
        </div>

        <!-- Step 1: waiting for OAuth popup -->
        @if (showConnect() && oauthStep() === 'waiting') {
          <div class="oauth-step">
            <div class="oauth-step-icon spin-wrap"><mat-icon class="spin">sync</mat-icon></div>
            <div>
              <div class="oauth-step-title">Zaloguj się przez Google w otwartym oknie</div>
              <div class="oauth-step-hint">Po zalogowaniu wróć tutaj — automatycznie wykryjemy zakończenie</div>
            </div>
            <button class="text-btn" (click)="cancelConnect()">Anuluj</button>
          </div>
        }

        <!-- Step 2: popup closed, need to get token -->
        @if (showConnect() && oauthStep() === 'get-token') {
          <div class="token-section">
            <div class="token-step-banner">
              <mat-icon>check_circle</mat-icon>
              <span>Zalogowałeś się! Ostatni krok — skopiuj token:</span>
            </div>
            <div class="console-box">
              <div class="console-label">Wklej w konsoli uufinds (F12 → Console):</div>
              <div class="console-cmd" (click)="copyConsoleCmd()">
                <code>copy(localStorage.USER_TOKEN)</code>
                <mat-icon class="copy-icon">{{ cmdCopied() ? 'check' : 'content_copy' }}</mat-icon>
              </div>
              <div class="console-hint">Naciśnij Enter — token trafi do schowka. Potem wklej poniżej:</div>
            </div>
            <div class="token-paste-row">
              <input class="form-input" type="password" [(ngModel)]="pastedToken"
                placeholder="Wklej token tutaj (Ctrl+V)..."
                (ngModelChange)="onTokenPaste($event)" />
              @if (pastedToken) {
                <button class="connect-btn" (click)="saveToken()">Połącz</button>
              }
            </div>
            <button class="open-uufinds-btn" (click)="openUufinds()">
              <mat-icon>open_in_new</mat-icon> Otwórz uufinds.com (F12 → Console)
            </button>
          </div>
        }
      </div>

      <!-- Drop zone -->
      <div class="drop-zone"
        [class.has-image]="imagePreviewUrl()"
        [class.drag-over]="isDragging()"
        (dragover)="onDragOver($event)"
        (dragleave)="isDragging.set(false)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()">

        @if (imagePreviewUrl()) {
          <img [src]="imagePreviewUrl()" class="preview-img" alt="Podgląd" />
          <div class="preview-overlay">
            @if (isUploading()) {
              <mat-icon class="spin">sync</mat-icon><span>Przesyłam...</span>
            } @else if (uufindsImageUrl()) {
              <mat-icon>cloud_done</mat-icon><span>Gotowe — zmień zdjęcie</span>
            } @else {
              <mat-icon>change_circle</mat-icon><span>Zmień zdjęcie</span>
            }
          </div>
        } @else {
          <div class="drop-placeholder">
            <div class="drop-icon-wrap"><mat-icon>add_photo_alternate</mat-icon></div>
            <p class="drop-label">Kliknij lub przeciągnij zdjęcie</p>
            <p class="drop-hint">JPG, PNG, WEBP</p>
          </div>
        }
      </div>
      <input #fileInput type="file" accept="image/*" style="display:none"
        (change)="onFileSelected($event)" />

      @if (imagePreviewUrl()) {
        <button class="search-btn" (click)="search()" [disabled]="isSearching() || isUploading()">
          @if (isUploading()) {
            <mat-icon class="spin">sync</mat-icon> Przesyłam obraz...
          } @else if (isSearching()) {
            <mat-icon class="spin">sync</mat-icon> Otwieranie...
          } @else {
            <mat-icon>image_search</mat-icon> Wyszukaj na obu stronach
          }
        </button>
      }

      <!-- Site instructions -->
      <div class="sites-info">
        <div class="site-card">
          <div class="site-logo">UU</div>
          <div class="site-body">
            <div class="site-name">uufinds.com</div>
            <div class="site-steps">
              <div class="step done"><mat-icon>check_circle</mat-icon> Strona otwiera się automatycznie</div>
              @if (uufindsToken()) {
                <div class="step done"><mat-icon>check_circle</mat-icon> Wyniki wyszukiwania od razu</div>
              } @else {
                <div class="step done"><mat-icon>check_circle</mat-icon> Obraz kopiowany do schowka</div>
                <div class="step action"><mat-icon>content_paste</mat-icon> Wklej <kbd>Ctrl+V</kbd> w pole wyszukiwania</div>
              }
            </div>
          </div>
        </div>
        <div class="site-card">
          <div class="site-logo">KK</div>
          <div class="site-body">
            <div class="site-name">kakobuy.com</div>
            <div class="site-steps">
              <div class="step done"><mat-icon>check_circle</mat-icon> Strona otwiera się automatycznie</div>
              <div class="step action"><mat-icon>photo_camera</mat-icon> Kliknij ikonę aparatu w wyszukiwarce</div>
              <div class="step action"><mat-icon>upload_file</mat-icon> Wybierz plik z dysku</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-page { padding: 20px 16px 32px; max-width: 540px; margin: 0 auto; animation: fadeUp .3s ease; }
    .search-header { margin-bottom: 16px; }
    .page-title { margin: 0 0 6px; font-size: 20px; font-weight: 700; color: var(--text); }
    .page-subtitle { margin: 0; font-size: 13px; color: var(--text-muted); }

    /* Connect card */
    .connect-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 14px 16px; margin-bottom: 16px;
      transition: border-color .2s;
    }
    .connect-card.connected { border-color: var(--border-primary); }
    .connect-header { display: flex; align-items: center; gap: 12px; }
    .connect-logo {
      width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
      background: var(--primary-glow); border: 1px solid var(--border-primary);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800; color: var(--primary); letter-spacing: .05em;
    }
    .connect-info { flex: 1; min-width: 0; }
    .connect-title { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
    .connect-status { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; }
    .connect-status mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .connect-status.ok { color: var(--success); }
    .connect-status.warn { color: var(--text-muted); }

    .text-btn {
      background: none; border: 1px solid var(--border); border-radius: 6px;
      padding: 5px 12px; font-size: 12px; font-weight: 600; color: var(--text-muted);
      cursor: pointer; font-family: inherit; transition: all .2s; white-space: nowrap;
      display: flex; align-items: center; gap: 4px;
    }
    .text-btn:hover { border-color: var(--primary); color: var(--primary); }
    .text-btn.primary { border-color: var(--border-primary); color: var(--primary); }
    .text-btn.danger:hover { border-color: var(--danger); color: var(--danger); }
    .text-btn:disabled { opacity: .5; cursor: not-allowed; }
    .spin-sm { font-size: 14px; width: 14px; height: 14px; animation: spin .7s linear infinite; }

    /* OAuth waiting step */
    .oauth-step {
      margin-top: 12px; border-top: 1px solid var(--border); padding-top: 12px;
      display: flex; align-items: flex-start; gap: 12px;
    }
    .oauth-step-icon { color: var(--primary); }
    .oauth-step-icon mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .spin-wrap { margin-top: 2px; }
    .oauth-step-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
    .oauth-step-hint { font-size: 11px; color: var(--text-muted); }

    /* Token section */
    .token-section {
      margin-top: 12px; border-top: 1px solid var(--border); padding-top: 12px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .token-step-banner {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600; color: var(--success);
    }
    .token-step-banner mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .console-box {
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 8px; padding: 10px 12px;
    }
    .console-label { font-size: 11px; color: var(--text-muted); margin-bottom: 6px; }
    .console-cmd {
      display: flex; align-items: center; justify-content: space-between;
      background: #0d1117; border-radius: 6px; padding: 8px 10px;
      cursor: pointer; gap: 8px; transition: background .15s;
    }
    .console-cmd:hover { background: #161b22; }
    .console-cmd code {
      font-family: monospace; font-size: 13px; color: #7ee787;
      flex: 1; user-select: all;
    }
    .copy-icon { font-size: 16px; width: 16px; height: 16px; color: var(--text-muted); flex-shrink: 0; }
    .console-hint { font-size: 11px; color: var(--text-muted); margin-top: 7px; }

    .token-paste-row { display: flex; gap: 8px; }
    .form-input {
      flex: 1; height: 38px; border-radius: 8px;
      border: 1px solid var(--border); background: var(--surface-2);
      color: var(--text); font-size: 13px; font-family: inherit;
      padding: 0 12px; outline: none; transition: border-color .2s;
    }
    .form-input:focus { border-color: var(--primary); }
    .connect-btn {
      height: 38px; padding: 0 16px; border-radius: 8px;
      background: var(--primary); color: #12121f;
      border: none; cursor: pointer; font-size: 13px; font-weight: 700;
      font-family: inherit; white-space: nowrap;
    }
    :host-context([data-theme="light"]) .connect-btn { color: white; }
    .open-uufinds-btn {
      display: flex; align-items: center; gap: 6px; justify-content: center;
      height: 36px; border-radius: 8px;
      border: 1px solid var(--border); background: none;
      color: var(--text-muted); font-size: 12px; font-weight: 600;
      cursor: pointer; font-family: inherit; transition: all .2s;
    }
    .open-uufinds-btn:hover { border-color: var(--primary); color: var(--primary); }
    .open-uufinds-btn mat-icon { font-size: 15px; width: 15px; height: 15px; }

    /* Drop zone */
    .drop-zone {
      width: 100%; min-height: 200px; border-radius: var(--radius);
      border: 2px dashed var(--border); background: var(--surface);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; position: relative; overflow: hidden;
      transition: border-color .2s, background .2s; margin-bottom: 16px;
    }
    .drop-zone:hover, .drop-zone.drag-over { border-color: var(--primary); background: var(--primary-glow); }
    .drop-zone.has-image { border-style: solid; min-height: 240px; }
    .drop-placeholder { text-align: center; padding: 32px 16px; }
    .drop-icon-wrap {
      width: 64px; height: 64px; border-radius: 18px;
      background: var(--primary-glow); border: 1px solid var(--border-primary);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px; transition: transform .2s;
    }
    .drop-zone:hover .drop-icon-wrap { transform: scale(1.08); }
    .drop-icon-wrap mat-icon { font-size: 30px; width: 30px; height: 30px; color: var(--primary); }
    .drop-label { margin: 0 0 6px; font-size: 15px; font-weight: 600; color: var(--text); }
    .drop-hint { margin: 0; font-size: 12px; color: var(--text-muted); }
    .preview-img { width: 100%; height: 100%; object-fit: contain; max-height: 320px; padding: 8px; }
    .preview-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,.45);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; opacity: 0; transition: opacity .2s; color: white; font-size: 13px; font-weight: 600;
    }
    .preview-overlay mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .drop-zone:hover .preview-overlay { opacity: 1; }

    /* Search button */
    .search-btn {
      width: 100%; height: 52px; border-radius: var(--radius-sm);
      background: var(--primary); color: #12121f;
      border: none; cursor: pointer; font-size: 15px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      font-family: inherit; margin-bottom: 24px; box-shadow: var(--shadow-primary);
      transition: opacity .2s, transform .2s, box-shadow .2s;
    }
    .search-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 0 32px var(--primary-glow-lg); }
    .search-btn:disabled { opacity: .6; cursor: not-allowed; }
    .search-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    :host-context([data-theme="light"]) .search-btn { color: white; }

    /* Site cards */
    .sites-info { display: flex; flex-direction: column; gap: 12px; }
    .site-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 16px;
      display: flex; gap: 14px; align-items: flex-start; transition: border-color .2s;
    }
    .site-card:hover { border-color: var(--border-primary); }
    .site-logo {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      background: var(--primary-glow); border: 1px solid var(--border-primary);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 800; color: var(--primary); letter-spacing: .05em;
    }
    .site-name { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 10px; }
    .site-steps { display: flex; flex-direction: column; gap: 6px; }
    .step { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted); }
    .step mat-icon { font-size: 15px; width: 15px; height: 15px; flex-shrink: 0; }
    .step.done { color: var(--success); }
    .step.done mat-icon { color: var(--success); }
    .step.action { color: var(--text); }
    .step.action mat-icon { color: var(--primary); }
    kbd {
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 4px; padding: 1px 5px; font-size: 11px; font-family: monospace;
    }
    .spin { animation: spin .7s linear infinite; }
  `],
})
export class SearchComponent implements OnInit, OnDestroy {
  private notify = inject(NotificationService);

  imageFile = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);
  isDragging = signal(false);
  isSearching = signal(false);
  isUploading = signal(false);
  uufindsToken = signal<string | null>(null);
  uufindsImageUrl = signal<string | null>(null);

  // Connect flow
  showConnect = signal(false);
  oauthStep = signal<'waiting' | 'get-token'>('waiting');
  isLoadingOAuth = signal(false);
  pastedToken = '';
  cmdCopied = signal(false);

  private popupRef: Window | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    const saved = localStorage.getItem(UUFINDS_TOKEN_KEY);
    if (saved) this.uufindsToken.set(saved);
  }

  ngOnDestroy(): void {
    this.clearPoll();
  }

  async startGoogleLogin(): Promise<void> {
    this.isLoadingOAuth.set(true);
    try {
      const res = await fetch(`${API}/oauth/google/url`);
      const json = await res.json();
      const oauthUrl = json.result;
      if (!oauthUrl) throw new Error('No URL');

      this.showConnect.set(true);
      this.oauthStep.set('waiting');
      this.pastedToken = '';

      this.popupRef = window.open(oauthUrl, 'uufinds_oauth',
        'width=500,height=650,left=200,top=100');

      // Poll for popup close
      this.pollTimer = setInterval(() => {
        if (this.popupRef?.closed) {
          this.clearPoll();
          this.oauthStep.set('get-token');
          // Auto-open uufinds so user can open DevTools there
          window.open('https://www.uufinds.com/qcfinds', 'uufinds_console');
        }
      }, 500);
    } catch {
      this.notify.notify('Błąd połączenia z uufinds');
    } finally {
      this.isLoadingOAuth.set(false);
    }
  }

  cancelConnect(): void {
    this.clearPoll();
    this.popupRef?.close();
    this.showConnect.set(false);
  }

  openUufinds(): void {
    window.open('https://www.uufinds.com/qcfinds', 'uufinds_console');
  }

  async copyConsoleCmd(): Promise<void> {
    try {
      await navigator.clipboard.writeText('copy(localStorage.USER_TOKEN)');
      this.cmdCopied.set(true);
      setTimeout(() => this.cmdCopied.set(false), 2000);
    } catch { /* ignore */ }
  }

  onTokenPaste(value: string): void {
    // Auto-save if pasted token looks like a JWT
    if (value.startsWith('eyJ') && value.length > 50) {
      // small delay to let ngModel update
      setTimeout(() => this.saveToken(), 100);
    }
  }

  async saveToken(): Promise<void> {
    const t = this.pastedToken.trim();
    if (!t) return;
    // Validate token
    try {
      const res = await fetch(`${API}/user/info`, {
        headers: { 'X-Access-Token': t }
      });
      const json = await res.json();
      if (!json.success) {
        this.notify.notify('Nieprawidłowy token — spróbuj ponownie');
        return;
      }
    } catch { /* proceed anyway */ }

    localStorage.setItem(UUFINDS_TOKEN_KEY, t);
    this.uufindsToken.set(t);
    this.showConnect.set(false);
    this.pastedToken = '';
    this.notify.notify('Połączono z uufinds!');

    const file = this.imageFile();
    if (file) this.uploadToUufinds(file, t);
  }

  disconnect(): void {
    localStorage.removeItem(UUFINDS_TOKEN_KEY);
    this.uufindsToken.set(null);
    this.uufindsImageUrl.set(null);
  }

  private clearPoll(): void {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.loadFile(file);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) this.loadFile(file);
  }

  private loadFile(file: File): void {
    this.imageFile.set(file);
    this.uufindsImageUrl.set(null);
    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.imagePreviewUrl.set(URL.createObjectURL(file));
    const token = this.uufindsToken();
    if (token) this.uploadToUufinds(file, token);
  }

  private async uploadToUufinds(file: File, token: string): Promise<void> {
    this.isUploading.set(true);
    this.uufindsImageUrl.set(null);
    try {
      const blob = await this.toJpegBlob(file);
      const fd = new FormData();
      fd.append('biz', 'mobile');
      fd.append('file', blob, 'product.jpg');
      const res = await fetch(`${API}/sys/common/upload`, {
        method: 'POST', headers: { 'X-Access-Token': token }, body: fd,
      });
      const json = await res.json();
      if (json.success && json.result?.url) this.uufindsImageUrl.set(json.result.url);
    } catch { /* ignore */ }
    finally { this.isUploading.set(false); }
  }

  search(): void {
    const file = this.imageFile();
    if (!file || this.isUploading()) return;
    this.isSearching.set(true);
    const imageUrl = this.uufindsImageUrl();
    if (imageUrl) {
      window.open(`https://www.uufinds.com/imageSearchList?imageUrl=${encodeURIComponent(imageUrl)}`, '_blank');
      window.open('https://www.kakobuy.com/', '_blank');
      this.notify.notify('Obie strony otwarte z wynikami!');
    } else {
      window.open('https://www.uufinds.com/qcfinds', '_blank');
      window.open('https://www.kakobuy.com/', '_blank');
      this.copyToClipboard(file);
    }
    this.isSearching.set(false);
  }

  private async copyToClipboard(file: File): Promise<void> {
    try {
      const blob = await this.toPngBlob(file);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      this.notify.notify('Obie strony otwarte! Wklej Ctrl+V na uufinds.');
    } catch {
      this.notify.notify('Obie strony otwarte — skopiuj obraz ręcznie.');
    }
  }

  private toJpegBlob(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d')!.drawImage(img, 0, 0, w, h);
        c.toBlob(b => b ? resolve(b) : reject(), 'image/jpeg', 0.85);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private toPngBlob(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d')!.drawImage(img, 0, 0);
        c.toBlob(b => b ? resolve(b) : reject(), 'image/png');
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
}
