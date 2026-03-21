import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../core/services/notification.service';

const UUFINDS_TOKEN_KEY = 'uufinds_token';
const UPLOAD_URL = 'https://api.uufinds.com/sys/common/upload';

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

      <!-- uufinds connection status -->
      <div class="connect-card" [class.connected]="uufindsToken()">
        <div class="connect-header">
          <div class="connect-logo">UU</div>
          <div class="connect-info">
            <div class="connect-title">uufinds.com</div>
            @if (uufindsToken()) {
              <div class="connect-status ok"><mat-icon>check_circle</mat-icon> Połączono — automatyczne wyszukiwanie</div>
            } @else {
              <div class="connect-status warn"><mat-icon>warning</mat-icon> Brak połączenia — tylko kopiowanie do schowka</div>
            }
          </div>
          @if (uufindsToken()) {
            <button class="disconnect-btn" (click)="disconnect()">Odłącz</button>
          }
        </div>

        @if (!uufindsToken()) {
          <div class="token-form">
            <p class="token-hint">
              Zaloguj się na <strong>uufinds.com</strong>, otwórz DevTools → Application → Local Storage → <code>USER_TOKEN</code> i wklej poniżej:
            </p>
            <div class="token-input-row">
              <input class="token-input" type="password" [(ngModel)]="tokenInput"
                placeholder="eyJ0eXAiOiJKV1..." />
              <button class="connect-btn" (click)="connect()" [disabled]="!tokenInput.trim()">
                Połącz
              </button>
            </div>
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
              <mat-icon class="spin">sync</mat-icon>
              <span>Przesyłam...</span>
            } @else if (uufindsImageUrl()) {
              <mat-icon>cloud_done</mat-icon>
              <span>Gotowe — zmień zdjęcie</span>
            } @else {
              <mat-icon>change_circle</mat-icon>
              <span>Zmień zdjęcie</span>
            }
          </div>
        } @else {
          <div class="drop-placeholder">
            <div class="drop-icon-wrap">
              <mat-icon>add_photo_alternate</mat-icon>
            </div>
            <p class="drop-label">Kliknij lub przeciągnij zdjęcie</p>
            <p class="drop-hint">JPG, PNG, WEBP</p>
          </div>
        }
      </div>
      <input #fileInput type="file" accept="image/*" style="display:none"
        (change)="onFileSelected($event)" />

      <!-- Search button -->
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

      <!-- Instructions -->
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
    .search-page {
      padding: 20px 16px 32px;
      max-width: 540px;
      margin: 0 auto;
      animation: fadeUp .3s ease;
    }
    .search-header { margin-bottom: 16px; }
    .page-title { margin: 0 0 6px; font-size: 20px; font-weight: 700; color: var(--text); }
    .page-subtitle { margin: 0; font-size: 13px; color: var(--text-muted); }

    /* Connect card */
    .connect-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 14px 16px;
      margin-bottom: 16px; transition: border-color .2s;
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
    .connect-status {
      display: flex; align-items: center; gap: 5px;
      font-size: 11px; font-weight: 600;
    }
    .connect-status mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .connect-status.ok { color: var(--success); }
    .connect-status.warn { color: var(--text-muted); }
    .disconnect-btn {
      background: none; border: 1px solid var(--border); border-radius: 6px;
      padding: 4px 10px; font-size: 11px; color: var(--text-muted);
      cursor: pointer; font-family: inherit; transition: all .2s;
    }
    .disconnect-btn:hover { border-color: var(--danger); color: var(--danger); }

    /* Token form */
    .token-form { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 12px; }
    .token-hint { margin: 0 0 10px; font-size: 12px; color: var(--text-muted); line-height: 1.5; }
    .token-hint strong { color: var(--text); }
    .token-hint code {
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 4px; padding: 1px 4px; font-size: 11px;
    }
    .token-input-row { display: flex; gap: 8px; }
    .token-input {
      flex: 1; height: 36px; border-radius: 8px;
      border: 1px solid var(--border); background: var(--surface-2);
      color: var(--text); font-size: 12px; font-family: monospace;
      padding: 0 10px; outline: none; transition: border-color .2s;
    }
    .token-input:focus { border-color: var(--primary); }
    .connect-btn {
      height: 36px; padding: 0 14px; border-radius: 8px;
      background: var(--primary); color: #12121f;
      border: none; cursor: pointer; font-size: 13px; font-weight: 700;
      font-family: inherit; transition: opacity .2s;
      white-space: nowrap;
    }
    .connect-btn:disabled { opacity: .5; cursor: not-allowed; }
    :host-context([data-theme="light"]) .connect-btn { color: white; }

    /* Drop zone */
    .drop-zone {
      width: 100%; min-height: 200px; border-radius: var(--radius);
      border: 2px dashed var(--border);
      background: var(--surface);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; position: relative; overflow: hidden;
      transition: border-color .2s, background .2s;
      margin-bottom: 16px;
    }
    .drop-zone:hover, .drop-zone.drag-over {
      border-color: var(--primary);
      background: var(--primary-glow);
    }
    .drop-zone.has-image { border-style: solid; min-height: 240px; }

    .drop-placeholder { text-align: center; padding: 32px 16px; }
    .drop-icon-wrap {
      width: 64px; height: 64px; border-radius: 18px;
      background: var(--primary-glow); border: 1px solid var(--border-primary);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px;
      transition: transform .2s;
    }
    .drop-zone:hover .drop-icon-wrap { transform: scale(1.08); }
    .drop-icon-wrap mat-icon { font-size: 30px; width: 30px; height: 30px; color: var(--primary); }
    .drop-label { margin: 0 0 6px; font-size: 15px; font-weight: 600; color: var(--text); }
    .drop-hint { margin: 0; font-size: 12px; color: var(--text-muted); }

    .preview-img { width: 100%; height: 100%; object-fit: contain; max-height: 320px; padding: 8px; }
    .preview-overlay {
      position: absolute; inset: 0;
      background: rgba(0,0,0,.45);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; opacity: 0; transition: opacity .2s;
      color: white; font-size: 13px; font-weight: 600;
    }
    .preview-overlay mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .drop-zone:hover .preview-overlay { opacity: 1; }
    .drop-zone.has-image:hover .preview-overlay { opacity: 1; }

    /* Show overlay when uploading even without hover */
    .drop-zone.has-image .preview-overlay:has(.spin) { opacity: 1; }

    /* Search button */
    .search-btn {
      width: 100%; height: 52px; border-radius: var(--radius-sm);
      background: var(--primary); color: #12121f;
      border: none; cursor: pointer; font-size: 15px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      font-family: inherit; margin-bottom: 24px;
      box-shadow: var(--shadow-primary);
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
      display: flex; gap: 14px; align-items: flex-start;
      transition: border-color .2s;
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
    .step {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; color: var(--text-muted);
    }
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
export class SearchComponent implements OnInit {
  private notify = inject(NotificationService);

  imageFile = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);
  isDragging = signal(false);
  isSearching = signal(false);
  isUploading = signal(false);
  uufindsToken = signal<string | null>(null);
  uufindsImageUrl = signal<string | null>(null);

  tokenInput = '';

  ngOnInit(): void {
    const saved = localStorage.getItem(UUFINDS_TOKEN_KEY);
    if (saved) this.uufindsToken.set(saved);
  }

  connect(): void {
    const t = this.tokenInput.trim();
    if (!t) return;
    localStorage.setItem(UUFINDS_TOKEN_KEY, t);
    this.uufindsToken.set(t);
    this.tokenInput = '';
    this.notify.notify('Połączono z uufinds!');
    // If image already loaded, upload it now
    const file = this.imageFile();
    if (file) this.uploadToUufinds(file, t);
  }

  disconnect(): void {
    localStorage.removeItem(UUFINDS_TOKEN_KEY);
    this.uufindsToken.set(null);
    this.uufindsImageUrl.set(null);
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

    // Pre-upload to uufinds in the background if token exists
    const token = this.uufindsToken();
    if (token) this.uploadToUufinds(file, token);
  }

  private async uploadToUufinds(file: File, token: string): Promise<void> {
    this.isUploading.set(true);
    this.uufindsImageUrl.set(null);
    try {
      const blob = await this.toJpegBlob(file);
      const formData = new FormData();
      formData.append('biz', 'mobile');
      formData.append('file', blob, 'product.jpg');

      const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: { 'X-Access-Token': token },
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.result?.url) {
        this.uufindsImageUrl.set(json.result.url);
      } else {
        // Token may be expired
        this.uufindsImageUrl.set(null);
      }
    } catch {
      this.uufindsImageUrl.set(null);
    } finally {
      this.isUploading.set(false);
    }
  }

  search(): void {
    const file = this.imageFile();
    if (!file || this.isUploading()) return;
    this.isSearching.set(true);

    const imageUrl = this.uufindsImageUrl();

    if (imageUrl) {
      // Open uufinds directly on image search results page + kakobuy
      const uuUrl = `https://www.uufinds.com/imageSearchList?imageUrl=${encodeURIComponent(imageUrl)}`;
      window.open(uuUrl, '_blank');
      window.open('https://www.kakobuy.com/', '_blank');
      this.notify.notify('Obie strony otwarte z wynikami!');
    } else {
      // Fallback: open blank pages + copy to clipboard
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
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        canvas.toBlob(b => b ? resolve(b) : reject(), 'image/jpeg', 0.85);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private toPngBlob(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        canvas.toBlob(b => b ? resolve(b) : reject(), 'image/png');
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
}
