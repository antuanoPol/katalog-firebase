import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { AuthService } from '../../core/services/auth.service';

interface FashionTrend {
  name: string;
  vintedCount: number;
  vintedGrowthPct: number | null;
  vintedWeeklyEst: number | null;
  redditMentions: number;
  googleTrend: boolean;
  score: number;
}
interface VintedBrand {
  title: string;
  itemCount: number;
  prettyCount: string;
  isLuxury: boolean;
  growthPct: number | null;
  weeklyGrowthEst: number | null;
}
interface TrendsData {
  updatedAt: string;
  fashionTrends?: FashionTrend[];
  vintedBrands: VintedBrand[];
}

@Component({
  selector: 'app-trends',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="trends-page">
      <div class="trends-header">
        <span class="trends-title">Trendy mody</span>
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
          <mat-icon>style</mat-icon>
          <p>Brak danych o trendach</p>
          <p class="empty-hint">Uruchom workflow "Fetch Trends" ręcznie w zakładce Actions na GitHub.</p>
        </div>
      } @else {
        <div class="updated-info">
          <mat-icon>update</mat-icon>
          Ostatnia aktualizacja: {{ formatDate(trendsData()!.updatedAt) }}
        </div>

        <!-- ── SECTION 1: Popularne style (fashion trends) ─────────────── -->
        <div class="section">
          <div class="section-title">
            <mat-icon>style</mat-icon>
            Popularne style
            <div class="legend">
              <span class="legend-item vinted-dot">V Vinted</span>
              <span class="legend-item reddit-dot">R Reddit</span>
              <span class="legend-item google-dot">G Google</span>
            </div>
          </div>

          @if (!(trendsData()!.fashionTrends ?? []).length) {
            <p class="no-data">Brak danych — uruchom workflow</p>
          } @else {
            <div class="style-list">
              @for (t of trendsData()!.fashionTrends!; track t.name; let i = $index) {
                <div class="style-row" [class.hot]="t.googleTrend && t.redditMentions > 0">
                  <span class="style-rank">{{ i + 1 }}</span>
                  <div class="style-main">
                    <div class="style-name-row">
                      <span class="style-name">{{ t.name }}</span>
                      <div class="style-badges">
                        @if (t.googleTrend) {
                          <span class="badge google">G</span>
                        }
                        @if (t.redditMentions > 0) {
                          <span class="badge reddit">R×{{ t.redditMentions }}</span>
                        }
                        @if (t.googleTrend && t.redditMentions > 0) {
                          <span class="badge hot-badge">
                            <mat-icon>local_fire_department</mat-icon>Hot
                          </span>
                        }
                      </div>
                    </div>
                    <div class="style-vinted">
                      {{ formatCount(t.vintedCount) }} przedmiotów na Vinted
                      @if (t.vintedWeeklyEst !== null) {
                        <span class="growth-inline" [class.pos]="t.vintedWeeklyEst! >= 0" [class.neg]="t.vintedWeeklyEst! < 0">
                          {{ t.vintedWeeklyEst! >= 0 ? '↑' : '↓' }}{{ t.vintedWeeklyEst | number:'1.1-1' }}%/tyg
                        </span>
                      }
                    </div>
                  </div>
                  <!-- Mini bar showing relative popularity -->
                  <div class="style-bar-wrap">
                    <div class="style-bar" [style.width.%]="getBarWidth(t.vintedCount)"></div>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- ── SECTION 2: Popularne marki na Vinted ───────────────────── -->
        @if (trendsData()!.vintedBrands.length > 0) {
          <div class="section">
            <div class="section-title">
              <mat-icon>local_offer</mat-icon>
              Popularne marki na Vinted
            </div>
            <div class="brands-list">
              @for (b of trendsData()!.vintedBrands; track b.title; let i = $index) {
                <div class="brand-row">
                  <span class="brand-rank">{{ i + 1 }}</span>
                  <div class="brand-info">
                    <span class="brand-name">{{ b.title }}</span>
                    @if (b.isLuxury) { <span class="luxury-tag">Luxury</span> }
                  </div>
                  <span class="brand-count">{{ b.prettyCount }}</span>
                  @if (b.weeklyGrowthEst !== null) {
                    <span class="growth-badge" [class.pos]="b.weeklyGrowthEst! >= 0" [class.neg]="b.weeklyGrowthEst! < 0">
                      {{ b.weeklyGrowthEst! >= 0 ? '+' : '' }}{{ b.weeklyGrowthEst | number:'1.1-1' }}%/tyg
                    </span>
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
    .trends-page { padding: 16px; max-width: 700px; margin: 0 auto; }
    .trends-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
    .trends-title { font-size: 18px; font-weight: 800; color: var(--text); }
    .toggle-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 20px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-muted); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .2s; }
    .toggle-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .toggle-btn.enabled { border-color: #4ade80; color: #4ade80; background: rgba(74,222,128,.08); }
    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 24px; color: var(--text-muted); }
    .loading-state mat-icon, .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .loading-state p, .empty-state p { margin: 0; font-size: 14px; }
    .empty-hint { font-size: 12px; text-align: center; line-height: 1.6; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .updated-info { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-muted); margin-bottom: 16px; }
    .updated-info mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .section { margin-bottom: 28px; }
    .section-title { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 12px; flex-wrap: wrap; }
    .section-title mat-icon { font-size: 15px; width: 15px; height: 15px; color: var(--primary); }
    .no-data { font-size: 13px; color: var(--text-muted); }
    /* Legend */
    .legend { display: flex; gap: 8px; margin-left: auto; }
    .legend-item { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px; }
    .vinted-dot { background: rgba(0,168,107,.15); color: #00a86b; }
    .reddit-dot { background: rgba(255,69,0,.15); color: #ff4500; }
    .google-dot { background: rgba(66,133,244,.15); color: #4285f4; }
    /* Style list */
    .style-list { display: flex; flex-direction: column; gap: 0; }
    .style-row { display: flex; align-items: center; gap: 10px; padding: 10px 8px; border-radius: 8px; transition: background .15s; }
    .style-row:hover { background: var(--surface-2); }
    .style-row.hot { background: rgba(255,100,0,.05); border-left: 3px solid #ff6400; padding-left: 6px; }
    .style-rank { font-size: 11px; font-weight: 700; color: var(--text-muted); width: 22px; text-align: right; flex-shrink: 0; }
    .style-main { flex: 1; min-width: 0; }
    .style-name-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .style-name { font-size: 14px; font-weight: 700; color: var(--text); }
    .style-badges { display: flex; align-items: center; gap: 4px; }
    .badge { padding: 1px 6px; border-radius: 6px; font-size: 10px; font-weight: 800; }
    .badge.google { background: rgba(66,133,244,.15); color: #4285f4; }
    .badge.reddit { background: rgba(255,69,0,.15); color: #ff4500; }
    .badge.hot-badge { display: flex; align-items: center; gap: 2px; background: rgba(255,100,0,.15); color: #ff6400; }
    .badge.hot-badge mat-icon { font-size: 11px; width: 11px; height: 11px; }
    .style-vinted { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .growth-inline { font-weight: 700; margin-left: 6px; }
    .growth-inline.pos { color: #4ade80; }
    .growth-inline.neg { color: #f43f5e; }
    .style-bar-wrap { width: 80px; height: 4px; background: var(--surface-2); border-radius: 2px; flex-shrink: 0; }
    .style-bar { height: 100%; background: var(--primary); border-radius: 2px; min-width: 2px; transition: width .3s; }
    /* Brands */
    .brands-list { display: flex; flex-direction: column; gap: 0; }
    .brand-row { display: flex; align-items: center; gap: 10px; padding: 9px 8px; border-radius: 8px; transition: background .15s; }
    .brand-row:hover { background: var(--surface-2); }
    .brand-rank { font-size: 11px; font-weight: 700; color: var(--text-muted); width: 22px; text-align: right; flex-shrink: 0; }
    .brand-info { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
    .brand-name { font-size: 13px; font-weight: 600; color: var(--text); }
    .luxury-tag { font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: rgba(255,193,7,.15); color: var(--primary); border: 1px solid rgba(255,193,7,.3); }
    .brand-count { font-size: 12px; font-weight: 700; color: var(--primary); flex-shrink: 0; }
    .growth-badge { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 10px; flex-shrink: 0; }
    .growth-badge.pos { background: rgba(74,222,128,.12); color: #4ade80; }
    .growth-badge.neg { background: rgba(244,63,94,.12); color: #f43f5e; }
  `],
})
export class TrendsComponent implements OnInit {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  loading = signal(true);
  enabled = signal(true);
  trendsData = signal<TrendsData | null>(null);

  private maxVintedCount = 0;

  getBarWidth(count: number): number {
    if (!this.maxVintedCount) return 0;
    return Math.round((count / this.maxVintedCount) * 100);
  }

  formatCount(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
    return String(n);
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadTrends(), this.loadConfig()]);
    this.loading.set(false);
  }

  private async loadTrends(): Promise<void> {
    try {
      const snap = await getDoc(doc(this.firestore, 'trends', 'latest'));
      if (snap.exists()) {
        const data = snap.data() as TrendsData;
        this.maxVintedCount = Math.max(...(data.fashionTrends ?? []).map(t => t.vintedCount), 1);
        this.trendsData.set(data);
      }
    } catch (e) { console.error('Error loading trends:', e); }
  }

  private async loadConfig(): Promise<void> {
    try {
      const snap = await getDoc(doc(this.firestore, 'trends', 'config'));
      if (snap.exists()) this.enabled.set(snap.data()['enabled'] !== false);
    } catch { /* no config = enabled */ }
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
