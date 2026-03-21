import { Component, signal, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="search-page">
      <div class="search-header">
        <h2 class="page-title">Wyszukiwanie obrazem</h2>
        <p class="page-subtitle">Wrzuć zdjęcie produktu — otworzymy obie strony jednocześnie</p>
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
            <mat-icon>change_circle</mat-icon>
            <span>Zmień zdjęcie</span>
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
        <button class="search-btn" (click)="search()" [disabled]="isSearching()">
          @if (isSearching()) {
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
              <div class="step done"><mat-icon>check_circle</mat-icon> Obraz kopiowany do schowka</div>
              <div class="step action"><mat-icon>content_paste</mat-icon> Wklej <kbd>Ctrl+V</kbd> w pole wyszukiwania</div>
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
    .search-header { margin-bottom: 20px; }
    .page-title { margin: 0 0 6px; font-size: 20px; font-weight: 700; color: var(--text); }
    .page-subtitle { margin: 0; font-size: 13px; color: var(--text-muted); }

    /* Drop zone */
    .drop-zone {
      width: 100%; min-height: 220px; border-radius: var(--radius);
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
    .drop-zone.has-image { border-style: solid; min-height: 260px; }

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

    .preview-img { width: 100%; height: 100%; object-fit: contain; max-height: 340px; padding: 8px; }
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
export class SearchComponent {
  private notify = inject(NotificationService);

  imageFile = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);
  isDragging = signal(false);
  isSearching = signal(false);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

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
    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.imagePreviewUrl.set(URL.createObjectURL(file));
  }

  async search(): Promise<void> {
    const file = this.imageFile();
    if (!file) return;
    this.isSearching.set(true);

    // Otwieramy OBA okna synchronicznie – musi być przed operacją async,
    // żeby Chrome nie zablokował drugiego okna jako popup
    window.open('https://www.uufinds.com/qcfinds', '_blank');
    window.open('https://www.kakobuy.com/', '_blank');

    try {
      const blob = await this.toPngBlob(file);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      this.notify.notify('Obie strony otwarte! Wklej Ctrl+V na uufinds.');
    } catch {
      this.notify.notify('Obie strony otwarte — skopiuj obraz ręcznie.');
    }

    this.isSearching.set(false);
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
