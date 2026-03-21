import { Injectable, signal, effect } from '@angular/core';

type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly KEY = 'katalog-theme';

  theme = signal<Theme>('dark');

  constructor() {
    const saved = (localStorage.getItem(this.KEY) as Theme) ?? 'dark';
    this.theme.set(saved);
    document.documentElement.setAttribute('data-theme', saved);

    effect(() => {
      const t = this.theme();
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem(this.KEY, t);
    });
  }

  toggle() {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }
}
