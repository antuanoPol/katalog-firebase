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
    <div class="aurora-bg">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>
    @if (auth.user()) {
      <div class="app-shell">
        <app-topbar />
        <app-tab-bar />
        <main class="content">
          <router-outlet />
        </main>
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    .app-shell { display: flex; flex-direction: column; height: 100dvh; position: relative; z-index: 1; }
    .content { flex: 1; overflow-y: auto; }
  `],
})
export class AppComponent {
  auth = inject(AuthService);
}
