import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { AuthService } from '../../core/services/auth.service';

interface InternetStyle { name: string; sources: string[]; score: number; }
interface VintedStyle   { name: string; count: number; growthPct: number | null; weeklyEst: number | null; }
interface TrendsData {
  updatedAt: string;
  internetStyles?: InternetStyle[];
  vintedStyles?: VintedStyle[];
}

const SRC_COLOR: Record<string, string> = {
  Google: '#4285f4', Reddit: '#ff4500', News: '#34a853',
  Magazine: '#e91e8c', Wykop: '#367fad', Pinterest: '#e60023',
};

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
          {{ enabled() ? 'Auto-odświeżanie włączone' : 'Wyłączone' }}
        </button>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <mat-icon class="spin">sync</mat-icon><p>Ładowanie...</p>
        </div>
      } @else if (!trendsData()) {
        <div class="empty-state">
          <mat-icon>style</mat-icon>
          <p>Brak danych — uruchom workflow "Fetch Trends" na GitHub Actions</p>
        </div>
      } @else {
        <div class="updated-info">
          <mat-icon>update</mat-icon>
          Ostatnia aktualizacja: {{ formatDate(trendsData()!.updatedAt) }}
        </div>

        <!-- ── SEKCJA 1: Popularne style w internecie ────────────────── -->
        <div class="section">
          <div class="section-title">
            <mat-icon>language</mat-icon>
            Popularne style w internecie
          </div>
          <div class="source-legend">
            @for (src of sourceKeys; track src) {
              <span class="src-chip" [style.background]="srcColor(src) + '22'" [style.color]="srcColor(src)" [style.border-color]="srcColor(src) + '55'">
                {{ src }}
              </span>
            }
          </div>

          @if (!(trendsData()!.internetStyles ?? []).length) {
            <p class="no-data">Brak danych z internetu</p>
          } @else {
            <div class="style-list">
              @for (t of trendsData()!.internetStyles!; track t.name; let i = $index) {
                <div class="style-row" [class.multi]="t.sources.length >= 3">
                  <span class="rank">{{ i + 1 }}</span>
                  <div class="style-info">
                    <div class="name-row">
                      <span class="name">{{ t.name }}</span>
                      @if (t.sources.length >= 3) {
                        <span class="hot-badge"><mat-icon>local_fire_department</mat-icon>Trending</span>
                      }
                    </div>
                    <div class="sources-row">
                      @for (src of t.sources; track src) {
                        <span class="src-badge" [style.background]="srcColor(src) + '22'" [style.color]="srcColor(src)">{{ src }}</span>
                      }
                    </div>
                  </div>
                  <div class="score-bar-wrap">
                    <div class="score-bar" [style.width.%]="getInternetBarWidth(t.score)"></div>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- ── SEKCJA 2: Popularne style na Vinted ───────────────────── -->
        <div class="section">
          <div class="section-title">
            <mat-icon>local_offer</mat-icon>
            Popularne style na Vinted
          </div>

          @if (!(trendsData()!.vintedStyles ?? []).length) {
            <p class="no-data">Brak danych z Vinted</p>
          } @else {
            <div class="style-list">
              @for (t of trendsData()!.vintedStyles!; track t.name; let i = $index) {
                <div class="style-row">
                  <span class="rank">{{ i + 1 }}</span>
                  <div class="style-info">
                    <div class="name-row">
                      <span class="name">{{ t.name }}</span>
                      @if (t.weeklyEst !== null && t.weeklyEst! > 5) {
                        <span class="rising-badge"><mat-icon>trending_up</mat-icon>Rośnie</span>
                      }
                    </div>
                    <span class="vinted-count">{{ formatCount(t.count) }} przedmiotów</span>
                  </div>
                  <div class="right-col">
                    @if (t.weeklyEst !== null) {
                      <span class="growth-badge" [class.pos]="t.weeklyEst! >= 0" [class.neg]="t.weeklyEst! < 0">
                        {{ t.weeklyEst! >= 0 ? '+' : '' }}{{ t.weeklyEst | number:'1.1-1' }}%/tyg
                      </span>
                    }
                    <div class="vinted-bar-wrap">
                      <div class="vinted-bar" [style.width.%]="getVintedBarWidth(t.count)"></div>
                    </div>
                  </div>
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
    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 24px; color: var(--text-muted); text-align: center; }
    .loading-state mat-icon, .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; }
    .loading-state p, .empty-state p { margin: 0; font-size: 13px; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .updated-info { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-muted); margin-bottom: 20px; }
    .updated-info mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .section { margin-bottom: 32px; }
    .section-title { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 10px; }
    .section-title mat-icon { font-size: 15px; width: 15px; height: 15px; color: var(--primary); }
    .no-data { font-size: 13px; color: var(--text-muted); }
    /* Source legend */
    .source-legend { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
    .src-chip { padding: 2px 8px; border-radius: 8px; font-size: 10px; font-weight: 700; border: 1px solid; }
    /* Style rows */
    .style-list { display: flex; flex-direction: column; gap: 2px; }
    .style-row { display: flex; align-items: center; gap: 10px; padding: 8px 8px; border-radius: 8px; transition: background .15s; }
    .style-row:hover { background: var(--surface-2); }
    .style-row.multi { border-left: 3px solid #ff6400; padding-left: 6px; }
    .rank { font-size: 11px; font-weight: 700; color: var(--text-muted); width: 20px; text-align: right; flex-shrink: 0; }
    .style-info { flex: 1; min-width: 0; }
    .name-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 2px; }
    .name { font-size: 14px; font-weight: 700; color: var(--text); }
    .hot-badge { display: flex; align-items: center; gap: 2px; padding: 1px 7px; border-radius: 10px; background: rgba(255,100,0,.15); color: #ff6400; font-size: 10px; font-weight: 800; }
    .hot-badge mat-icon { font-size: 11px; width: 11px; height: 11px; }
    .rising-badge { display: flex; align-items: center; gap: 2px; padding: 1px 7px; border-radius: 10px; background: rgba(74,222,128,.12); color: #4ade80; font-size: 10px; font-weight: 800; }
    .rising-badge mat-icon { font-size: 11px; width: 11px; height: 11px; }
    .sources-row { display: flex; gap: 4px; flex-wrap: wrap; }
    .src-badge { padding: 0 5px; border-radius: 5px; font-size: 10px; font-weight: 700; line-height: 16px; }
    .vinted-count { font-size: 11px; color: var(--text-muted); }
    /* Right column */
    .right-col { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
    .growth-badge { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 10px; white-space: nowrap; }
    .growth-badge.pos { background: rgba(74,222,128,.12); color: #4ade80; }
    .growth-badge.neg { background: rgba(244,63,94,.12); color: #f43f5e; }
    /* Bar */
    .score-bar-wrap, .vinted-bar-wrap { width: 70px; height: 4px; background: var(--surface-2); border-radius: 2px; }
    .score-bar { height: 100%; background: #4285f4; border-radius: 2px; min-width: 2px; }
    .vinted-bar { height: 100%; background: var(--primary); border-radius: 2px; min-width: 2px; }
  `],
})
export class TrendsComponent implements OnInit {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);
  loading = signal(true);
  enabled = signal(true);
  trendsData = signal<TrendsData | null>(null);

  sourceKeys = ['Google', 'Reddit', 'News', 'Magazine', 'Wykop', 'Pinterest'];
  srcColor(s: string) { return SRC_COLOR[s] ?? '#888'; }

  private maxInternetScore = 1;
  private maxVintedCount = 1;

  getInternetBarWidth(score: number) { return Math.round((score / this.maxInternetScore) * 100); }
  getVintedBarWidth(count: number)   { return Math.round((count / this.maxVintedCount) * 100); }

  formatCount(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'k';
    return String(n);
  }

  async ngOnInit() {
    await Promise.all([this.loadTrends(), this.loadConfig()]);
    this.loading.set(false);
  }

  private async loadTrends() {
    try {
      const snap = await getDoc(doc(this.firestore, 'trends', 'latest'));
      if (snap.exists()) {
        const data = snap.data() as TrendsData;
        this.maxInternetScore = Math.max(...(data.internetStyles ?? []).map(t => t.score), 1);
        this.maxVintedCount   = Math.max(...(data.vintedStyles   ?? []).map(t => t.count), 1);
        this.trendsData.set(data);
      }
    } catch (e) { console.error('Error loading trends:', e); }
  }

  private async loadConfig() {
    try {
      const snap = await getDoc(doc(this.firestore, 'trends', 'config'));
      if (snap.exists()) this.enabled.set(snap.data()['enabled'] !== false);
    } catch {}
  }

  async toggleEnabled() {
    const next = !this.enabled();
    this.enabled.set(next);
    try {
      await setDoc(doc(this.firestore, 'trends', 'config'), { enabled: next, updatedAt: new Date().toISOString() });
    } catch { this.enabled.set(!next); }
  }

  formatDate(iso: string) {
    return new Date(iso).toLocaleString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
