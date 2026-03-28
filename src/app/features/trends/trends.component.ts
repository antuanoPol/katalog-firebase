import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { AuthService } from '../../core/services/auth.service';

interface TrendsData {
  updatedAt: string;
  wikiTrending?: string[];
  googleTrends?: string[]; // legacy field
  vintedBrands: { title: string; itemCount: number; prettyCount: string; isLuxury: boolean }[];
  vintedStyles?: { title: string; count: number }[];
}

@Component({
  selector: 'app-trends',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="trends-page">
      <div class="trends-header">
        <span class="trends-title">Trendy</span>
        <button class="toggle-btn" [class.enabled]="enabled()" (click)="toggleEnabled()">
          <mat-icon>{{ enabled() ? 'notifications_active' : 'notifications_off' }}</mat-icon>
          {{ enabled() ? 'Auto-odświeżanie włączone' : 'Auto-odświeżanie wyłączone' }}
        </button>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <mat-icon class="spin">sync</mat-icon>
          <p>Ładowanie danych...</p>
        </div>
      } @else if (!trendsData()) {
        <div class="empty-state">
          <mat-icon>trending_up</mat-icon>
          <p>Brak danych o trendach</p>
          <p class="empty-hint">Dane pojawią się po pierwszym uruchomieniu GitHub Actions.<br>
            Możesz też uruchomić workflow ręcznie w zakładce Actions na GitHub.</p>
        </div>
      } @else {
        <div class="updated-info">
          <mat-icon>update</mat-icon>
          Ostatnia aktualizacja: {{ formatDate(trendsData()!.updatedAt) }}
        </div>

        <!-- Wikipedia Trending -->
        @if (wikiItems().length > 0) {
          <div class="section">
            <div class="section-title">
              <mat-icon>public</mat-icon>
              Popularne w Polsce (Wikipedia)
            </div>
            <div class="tags-list">
              @for (term of wikiItems(); track term; let i = $index) {
                <div class="tag" [class.top3]="i < 3">
                  @if (i < 3) { <span class="rank">{{ i + 1 }}</span> }
                  {{ term }}
                </div>
              }
            </div>
          </div>
        }

        <!-- Vinted Styles -->
        @if ((trendsData()!.vintedStyles ?? []).length > 0) {
          <div class="section">
            <div class="section-title">
              <mat-icon>style</mat-icon>
              Popularne style na Vinted
            </div>
            <div class="styles-grid">
              @for (s of trendsData()!.vintedStyles!; track s.title; let i = $index) {
                <div class="style-card" [class.top]="i < 3">
                  @if (i < 3) { <span class="style-rank">{{ i + 1 }}</span> }
                  <span class="style-name">{{ s.title }}</span>
                  <span class="style-count">{{ s.count }}</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Vinted Brands -->
        @if (trendsData()!.vintedBrands.length > 0) {
          <div class="section">
            <div class="section-title">
              <mat-icon>local_offer</mat-icon>
              Popularne marki na Vinted
            </div>
            <div class="vinted-list">
              @for (item of trendsData()!.vintedBrands; track item.title; let i = $index) {
                <div class="vinted-item">
                  <span class="vinted-rank">{{ i + 1 }}</span>
                  <div class="vinted-info">
                    <div class="vinted-title">{{ item.title }}</div>
                    @if (item.isLuxury) {
                      <div class="vinted-brand">Luxury</div>
                    }
                  </div>
                  @if (item.prettyCount) {
                    <div class="vinted-price">{{ item.prettyCount }}</div>
                  }
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; overflow-y: auto; }
    .trends-page { padding: 16px; max-width: 640px; margin: 0 auto; }
    .trends-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
    .trends-title { font-size: 18px; font-weight: 800; color: var(--text); }
    .toggle-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 14px; border-radius: 20px;
      border: 1px solid var(--border); background: var(--surface-2);
      color: var(--text-muted); font-size: 12px; font-weight: 600;
      cursor: pointer; font-family: inherit; transition: all .2s;
    }
    .toggle-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .toggle-btn.enabled { border-color: #4ade80; color: #4ade80; background: rgba(74,222,128,.08); }
    .loading-state, .empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; padding: 80px 24px; color: var(--text-muted);
    }
    .loading-state mat-icon, .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .loading-state p, .empty-state p { margin: 0; font-size: 14px; }
    .empty-hint { font-size: 12px; text-align: center; line-height: 1.6; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .updated-info {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; color: var(--text-muted); margin-bottom: 16px;
    }
    .updated-info mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .section { margin-bottom: 24px; }
    .section-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 700; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: .06em; margin-bottom: 12px;
    }
    .section-title mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--primary); }
    .tags-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .tag {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 20px;
      background: var(--surface-2); border: 1px solid var(--border);
      font-size: 13px; color: var(--text); font-weight: 500;
    }
    .tag.top3 { border-color: var(--primary); color: var(--primary); background: rgba(255,193,7,.08); font-weight: 700; }
    .rank {
      width: 18px; height: 18px; border-radius: 50%;
      background: var(--primary); color: #12121f;
      font-size: 10px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
    }
    .styles-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .style-card {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 14px; border-radius: 20px;
      background: var(--surface-2); border: 1px solid var(--border);
      font-size: 13px; font-weight: 600; color: var(--text);
    }
    .style-card.top { border-color: var(--primary); color: var(--primary); background: rgba(255,193,7,.08); }
    .style-rank {
      width: 18px; height: 18px; border-radius: 50%;
      background: var(--primary); color: #12121f;
      font-size: 10px; font-weight: 800;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .style-count { font-size: 11px; color: var(--text-muted); font-weight: 400; }
    .vinted-list { display: flex; flex-direction: column; gap: 0; }
    .vinted-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 0; border-bottom: 1px solid var(--border);
    }
    .vinted-rank { font-size: 12px; font-weight: 700; color: var(--text-muted); width: 20px; text-align: center; flex-shrink: 0; }
    .vinted-info { flex: 1; min-width: 0; }
    .vinted-title { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .vinted-brand { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .vinted-price { font-size: 13px; font-weight: 700; color: var(--primary); flex-shrink: 0; }
  `],
})
export class TrendsComponent implements OnInit {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  loading = signal(true);
  enabled = signal(true);
  trendsData = signal<TrendsData | null>(null);

  wikiItems() {
    const d = this.trendsData();
    return d?.wikiTrending ?? d?.googleTrends ?? [];
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadTrends(), this.loadConfig()]);
    this.loading.set(false);
  }

  private async loadTrends(): Promise<void> {
    try {
      const snap = await getDoc(doc(this.firestore, 'trends', 'latest'));
      if (snap.exists()) this.trendsData.set(snap.data() as TrendsData);
    } catch (e) {
      console.error('Error loading trends:', e);
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const snap = await getDoc(doc(this.firestore, 'trends', 'config'));
      if (snap.exists()) this.enabled.set(snap.data()['enabled'] !== false);
    } catch { /* brak config = enabled */ }
  }

  async toggleEnabled(): Promise<void> {
    const next = !this.enabled();
    this.enabled.set(next);
    try {
      await setDoc(doc(this.firestore, 'trends', 'config'), { enabled: next, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.error('Error saving config:', e);
      this.enabled.set(!next);
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
