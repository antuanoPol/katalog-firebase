import { Component, signal, inject, OnInit } from '@angular/core';
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
          } @else {
            <button class="text-btn" (click)="toggleLoginForm()">
              {{ showLogin() ? 'Anuluj' : 'Zaloguj' }}
            </button>
          }
        </div>

        @if (showLogin() && !uufindsToken()) {
          <div class="login-form">
            <div class="form-row">
              <input class="form-input" type="email" [(ngModel)]="loginEmail"
                placeholder="E-mail" autocomplete="email" />
            </div>
            <div class="form-row">
              <input class="form-input" type="password" [(ngModel)]="loginPassword"
                placeholder="Hasło" autocomplete="current-password" />
            </div>
            <div class="captcha-row">
              @if (captchaImg()) {
                <img [src]="captchaImg()" class="captcha-img" (click)="loadCaptcha()" title="Kliknij aby odświeżyć" />
              } @else {
                <div class="captcha-placeholder" (click)="loadCaptcha()">
                  <mat-icon class="spin">sync</mat-icon>
                </div>
              }
              <input class="form-input captcha-input" [(ngModel)]="captchaCode"
                placeholder="Kod z obrazka" (keydown.enter)="loginToUufinds()" />
            </div>
            <div class="form-actions">
              @if (loginError()) {
                <span class="login-error"><mat-icon>error_outline</mat-icon> {{ loginError() }}</span>
              }
              <button class="connect-btn" (click)="loginToUufinds()"
                [disabled]="isLoggingIn() || !loginEmail || !loginPassword || !captchaCode">
                @if (isLoggingIn()) {
                  <mat-icon class="spin">sync</mat-icon> Logowanie...
                } @else {
                  Zaloguj się
                }
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
    .text-btn {
      background: none; border: 1px solid var(--border); border-radius: 6px;
      padding: 5px 12px; font-size: 12px; font-weight: 600; color: var(--text-muted);
      cursor: pointer; font-family: inherit; transition: all .2s; white-space: nowrap;
    }
    .text-btn:hover { border-color: var(--primary); color: var(--primary); }
    .text-btn.danger:hover { border-color: var(--danger); color: var(--danger); }

    /* Login form */
    .login-form { margin-top: 14px; border-top: 1px solid var(--border); padding-top: 14px; display: flex; flex-direction: column; gap: 8px; }
    .form-row { display: flex; }
    .form-input {
      flex: 1; height: 38px; border-radius: 8px;
      border: 1px solid var(--border); background: var(--surface-2);
      color: var(--text); font-size: 13px; font-family: inherit;
      padding: 0 12px; outline: none; transition: border-color .2s;
    }
    .form-input:focus { border-color: var(--primary); }
    .captcha-row { display: flex; gap: 8px; align-items: center; }
    .captcha-img {
      height: 38px; border-radius: 6px; border: 1px solid var(--border);
      cursor: pointer; object-fit: contain; background: white; min-width: 90px;
    }
    .captcha-placeholder {
      width: 90px; height: 38px; border-radius: 6px; border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      background: var(--surface-2); cursor: pointer;
    }
    .captcha-placeholder mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted); }
    .captcha-input { min-width: 0; }
    .form-actions { display: flex; align-items: center; gap: 10px; justify-content: flex-end; }
    .login-error {
      flex: 1; display: flex; align-items: center; gap: 5px;
      font-size: 11px; color: var(--danger);
    }
    .login-error mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .connect-btn {
      height: 38px; padding: 0 18px; border-radius: 8px;
      background: var(--primary); color: #12121f;
      border: none; cursor: pointer; font-size: 13px; font-weight: 700;
      font-family: inherit; transition: opacity .2s;
      display: flex; align-items: center; gap: 6px; white-space: nowrap;
    }
    .connect-btn:disabled { opacity: .5; cursor: not-allowed; }
    .connect-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
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
      border-color: var(--primary); background: var(--primary-glow);
    }
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
      position: absolute; inset: 0;
      background: rgba(0,0,0,.45);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; opacity: 0; transition: opacity .2s;
      color: white; font-size: 13px; font-weight: 600;
    }
    .preview-overlay mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .drop-zone:hover .preview-overlay { opacity: 1; }

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
export class SearchComponent implements OnInit {
  private notify = inject(NotificationService);

  imageFile = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);
  isDragging = signal(false);
  isSearching = signal(false);
  isUploading = signal(false);
  uufindsToken = signal<string | null>(null);
  uufindsImageUrl = signal<string | null>(null);

  // Login form
  showLogin = signal(false);
  loginEmail = '';
  loginPassword = '';
  captchaCode = '';
  captchaImg = signal<string | null>(null);
  captchaKey = '';
  isLoggingIn = signal(false);
  loginError = signal<string | null>(null);

  ngOnInit(): void {
    const saved = localStorage.getItem(UUFINDS_TOKEN_KEY);
    if (saved) this.uufindsToken.set(saved);
  }

  toggleLoginForm(): void {
    this.showLogin.update(v => !v);
    if (this.showLogin()) this.loadCaptcha();
    this.loginError.set(null);
  }

  async loadCaptcha(): Promise<void> {
    this.captchaImg.set(null);
    this.captchaKey = Math.random().toString(36).substring(2) + Date.now();
    try {
      const res = await fetch(`${API}/user/captcha/image/${this.captchaKey}`);
      const json = await res.json();
      if (json.success && json.message) {
        this.captchaImg.set(json.message); // base64 data URI
      }
    } catch { /* ignore */ }
  }

  async loginToUufinds(): Promise<void> {
    if (!this.loginEmail || !this.loginPassword || !this.captchaCode) return;
    this.isLoggingIn.set(true);
    this.loginError.set(null);
    try {
      const res = await fetch(`${API}/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.loginEmail,
          password: this.loginPassword,
          captcha: this.captchaCode,
          checkKey: this.captchaKey,
        }),
      });
      const json = await res.json();
      if (json.success && json.result?.token) {
        const token = json.result.token;
        localStorage.setItem(UUFINDS_TOKEN_KEY, token);
        this.uufindsToken.set(token);
        this.showLogin.set(false);
        this.loginEmail = '';
        this.loginPassword = '';
        this.captchaCode = '';
        this.notify.notify('Połączono z uufinds!');
        const file = this.imageFile();
        if (file) this.uploadToUufinds(file, token);
      } else {
        this.loginError.set(json.message || 'Błąd logowania');
        this.captchaCode = '';
        this.loadCaptcha();
      }
    } catch {
      this.loginError.set('Błąd połączenia z siecią');
    } finally {
      this.isLoggingIn.set(false);
    }
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
      const res = await fetch(`${API}/sys/common/upload`, {
        method: 'POST',
        headers: { 'X-Access-Token': token },
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.result?.url) {
        this.uufindsImageUrl.set(json.result.url);
      }
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
