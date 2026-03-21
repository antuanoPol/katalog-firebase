import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
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
        <main class="content">
          <router-outlet />
        </main>
        <app-tab-bar />
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    .app-shell { display: flex; flex-direction: column; height: 100dvh; background: var(--bg); }
    .content { flex: 1; overflow-y: auto; padding-bottom: 72px; }
  `],
})
export class AppComponent {
  auth = inject(AuthService);
}
