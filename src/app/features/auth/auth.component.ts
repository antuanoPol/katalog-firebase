import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatTabsModule, MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon class="logo-icon">inventory_2</mat-icon>
            Katalog Produktów
          </mat-card-title>
          <mat-card-subtitle>Twój prywatny katalog z synchronizacją między urządzeniami</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <mat-tab-group (selectedIndexChange)="onTabChange($event)" animationDuration="0">
            <mat-tab label="Zaloguj się"></mat-tab>
            <mat-tab label="Zarejestruj"></mat-tab>
          </mat-tab-group>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Adres e-mail</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
              <mat-icon matSuffix>email</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Hasło</mat-label>
              <input matInput [type]="hidePassword ? 'password' : 'text'"
                formControlName="password"
                [autocomplete]="auth.authMode() === 'login' ? 'current-password' : 'new-password'" />
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            @if (auth.authError()) {
              <p class="auth-error">{{ auth.authError() }}</p>
            }

            <button mat-raised-button color="primary" type="submit"
              class="full-width submit-btn"
              [disabled]="auth.isLoading() || form.invalid">
              @if (auth.isLoading()) {
                <mat-spinner diameter="20" />
              } @else {
                {{ auth.authMode() === 'login' ? 'Zaloguj się' : 'Zarejestruj' }}
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; padding: 16px;
      background: radial-gradient(ellipse at 50% 0%, rgba(168,85,247,.15) 0%, var(--bg) 70%);
    }
    .auth-card { width: 100%; max-width: 400px; }
    mat-card-header { flex-direction: column; align-items: center; padding-bottom: 8px; }
    .logo-icon {
      font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px;
      color: var(--primary); filter: drop-shadow(0 0 12px var(--primary));
    }
    mat-card-title {
      display: flex; flex-direction: column; align-items: center; font-size: 22px;
      font-weight: 700; letter-spacing: 0.02em;
      background: linear-gradient(135deg, #fff 0%, var(--primary) 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    mat-card-subtitle { text-align: center; margin-top: 4px; color: var(--text-muted) !important; }
    .auth-form { display: flex; flex-direction: column; gap: 0; padding-top: 16px; }
    .full-width { width: 100%; }
    .submit-btn { margin-top: 8px; height: 44px; font-weight: 600; letter-spacing: .06em; }
    .auth-error { color: var(--danger); font-size: 13px; margin: 4px 0 8px; }
    mat-spinner { margin: 0 auto; }
  `],
})
export class AuthComponent {
  auth = inject(AuthService);
  private fb = inject(FormBuilder);

  hidePassword = true;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onTabChange(index: number): void {
    this.auth.setAuthMode(index === 0 ? 'login' : 'register');
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    const { email, password } = this.form.value;
    if (this.auth.authMode() === 'login') {
      await this.auth.login(email!, password!);
    } else {
      await this.auth.register(email!, password!);
    }
  }
}
