import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { TopbarComponent } from './shared/components/topbar/topbar.component';
import { TabBarComponent } from './shared/components/tab-bar/tab-bar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TopbarComponent, TabBarComponent],
  template: `
    @if (auth.user()) {
      <div class="app-shell">
        <app-topbar />
        <div class="shell-body">
          <app-tab-bar />
          <main class="content">
            <router-outlet />
          </main>
        </div>
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    .app-shell { display: flex; flex-direction: column; height: 100dvh; background: var(--bg); }
    .shell-body { flex: 1; display: flex; min-height: 0; }
    .content { flex: 1; overflow-y: auto; padding-bottom: 72px; }
    @media (min-width: 768px) {
      .content { padding-bottom: 0; }
    }
  `],
})
export class AppComponent {
  auth = inject(AuthService);
  // Inject ThemeService to ensure it initializes on app startup and applies saved theme
  theme = inject(ThemeService);
}
