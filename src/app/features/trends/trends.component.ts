import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { AuthService } from '../../core/services/auth.service';

interface TrendItem {
  term: string;
  sources: string[];
  score: number;
  breakout: boolean;
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
  internetTrends?: TrendItem[];
  vintedBrands: VintedBrand[];
  vintedStyles?: { title: string; count: number }[];
  // legacy
  wikiTrending?: string[];
  googleTrends?: string[];
}

const SOURCE_LABEL: Record<string, string> = {
  google: 'G', wiki: 'W', reddit: 'R', wykop: 'Wk',
};
const SOURCE_COLOR: Record<string, string> = {
  google: '#4285f4', wiki: '#f5a623', reddit: '#ff4500', wykop: '#367fad',
};

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
          <p class="empty-hint">Uruchom workflow "Fetch Trends" ręcznie w zakładce Actions na GitHub.</p>
        </div>
      } @else {
        <div class="updated-info">
          <mat-icon>update</mat-icon>
          Ostatnia aktualizacja: {{ formatDate(trendsData()!.updatedAt) }}
        </div>

        <!-- ── SECTION 1: Popularne w Internecie ────────────────────────── -->
        <div class="section">
          <div class="section-title">
            <mat-icon>language</mat-icon>
            Popularne w internecie
            <div class="source-legend">
              @for (s of sourceKeys; track s) {
                <span class="legend-dot" [style.background]="sourceColor(s)">{{ sourceLabel(s) }}</span>
              }
            </div>
          </div>

          @if (internetItems().length === 0) {
            <p class="no-data">Brak danych — uruchom workflow "Fetch Trends"</p>
          } @else {
            <div class="trends-list">
              @for (item of internetItems(); track item.term; let i = $index) {
                <div class="trend-row" [class.breakout]="item.breakout">
                  <span class="trend-rank">{{ i + 1 }}</span>
                  <div class="trend-info">
                    <span class="trend-term">{{ item.term }}</span>
                    <div class="trend-sources">
                      @for (src of item.sources; track src) {
                        <span class="source-badge" [style.background]="sourceColor(src)">{{ sourceLabel(src) }}</span>
                      }
                    </div>
                  </div>
                  @if (item.breakout) {
                    <span class="breakout-badge">
                      <mat-icon>local_fire_department</mat-icon>
                      Breakout
                    </span>
                  } @else if (item.score >= 3) {
                    <span class="rising-badge">
                      <mat-icon>trending_up</mat-icon>
                      Rośnie
                    </span>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- ── SECTION 2: Popularne na Vinted ──────────────────────────── -->
        <div class="section">
          <div class="section-title">
            <mat-icon>local_offer</mat-icon>
            Popularne na Vinted
          </div>

          <!-- Styles chips -->
          @if ((trendsData()!.vintedStyles ?? []).length > 0) {
            <div class="styles-row">
              @for (s of trendsData()!.vintedStyles!; track s.title; let i = $index) {
                <div class="style-chip" [class.top]="i < 3">
                  @if (i < 3) { <span class="chip-rank">{{ i + 1 }}</span> }
                  {{ s.title }}
                </div>
              }
            </div>
          }

          <!-- Brands list -->
          @if (trendsData()!.vintedBrands.length > 0) {
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
                    <span class="growth-badge"
                      [class.pos]="b.weeklyGrowthEst! >= 0"
                      [class.neg]="b.weeklyGrowthEst! < 0">
                      {{ b.weeklyGrowthEst! >= 0 ? '+' : '' }}{{ b.weeklyGrowthEst | number:'1.1-1' }}%/tyg
                    </span>
                  } @else if (b.growthPct !== null) {
                    <span class="growth-badge"
                      [class.pos]="b.growthPct! >= 0"
                      [class.neg]="b.growthPct! < 0">
                      {{ b.growthPct! >= 0 ? '+' : '' }}{{ b.growthPct | number:'1.1-1' }}%
                    </span>
                  }
                </div>
              }
            </div>
          }
        </div>
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
    /* Source legend */
    .source-legend { display: flex; gap: 4px; margin-left: auto; }
    .legend-dot { padding: 1px 6px; border-radius: 6px; font-size: 10px; font-weight: 700; color: #fff; opacity: .85; }
    /* Internet trends list */
    .trends-list { display: flex; flex-direction: column; gap: 0; }
    .trend-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; transition: background .15s; }
    .trend-row:hover { background: var(--surface-2); }
    .trend-row.breakout { background: rgba(255,100,0,.06); border-left: 3px solid #ff6400; padding-left: 8px; }
    .trend-rank { font-size: 11px; font-weight: 700; color: var(--text-muted); width: 22px; text-align: center; flex-shrink: 0; }
    .trend-info { flex: 1; min-width: 0; }
    .trend-term { font-size: 13px; font-weight: 600; color: var(--text); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .trend-sources { display: flex; gap: 3px; margin-top: 2px; }
    .source-badge { padding: 0 5px; border-radius: 4px; font-size: 9px; font-weight: 800; color: #fff; line-height: 14px; }
    .breakout-badge { display: flex; align-items: center; gap: 3px; padding: 3px 8px; border-radius: 12px; background: rgba(255,100,0,.15); color: #ff6400; font-size: 11px; font-weight: 700; flex-shrink: 0; white-space: nowrap; }
    .breakout-badge mat-icon { font-size: 13px; width: 13px; height: 13px; }
    .rising-badge { display: flex; align-items: center; gap: 3px; padding: 3px 8px; border-radius: 12px; background: rgba(74,222,128,.1); color: #4ade80; font-size: 11px; font-weight: 700; flex-shrink: 0; white-space: nowrap; }
    .rising-badge mat-icon { font-size: 13px; width: 13px; height: 13px; }
    /* Vinted styles */
    .styles-row { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 14px; }
    .style-chip { display: flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 16px; background: var(--surface-2); border: 1px solid var(--border); font-size: 12px; font-weight: 600; color: var(--text); }
    .style-chip.top { border-color: var(--primary); color: var(--primary); background: rgba(255,193,7,.07); }
    .chip-rank { width: 16px; height: 16px; border-radius: 50%; background: var(--primary); color: #12121f; font-size: 9px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    /* Brands list */
    .brands-list { display: flex; flex-direction: column; gap: 0; }
    .brand-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); }
    .brand-rank { font-size: 11px; font-weight: 700; color: var(--text-muted); width: 22px; text-align: center; flex-shrink: 0; }
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

  sourceKeys = ['google', 'wiki', 'reddit', 'wykop'];
  sourceLabel(s: string) { return SOURCE_LABEL[s] ?? s; }
  sourceColor(s: string) { return SOURCE_COLOR[s] ?? '#888'; }

  internetItems() {
    return this.trendsData()?.internetTrends ?? [];
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadTrends(), this.loadConfig()]);
    this.loading.set(false);
  }

  private async loadTrends(): Promise<void> {
    try {
      const snap = await getDoc(doc(this.firestore, 'trends', 'latest'));
      if (snap.exists()) this.trendsData.set(snap.data() as TrendsData);
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
