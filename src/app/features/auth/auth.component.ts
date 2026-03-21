import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="auth-bg">
      <div class="auth-card" [class.anim]="true">

        <!-- Header -->
        <div class="auth-header">
          <div class="auth-logo">
            <mat-icon>inventory_2</mat-icon>
          </div>
          <h1 class="auth-title">Katalog Produktów</h1>
          <p class="auth-subtitle">Twój prywatny katalog z synchronizacją</p>
        </div>

        <!-- Mode tabs -->
        <div class="auth-tabs">
          <button class="auth-tab" [class.active]="auth.authMode() === 'login'"
            (click)="auth.setAuthMode('login')">Logowanie</button>
          <button class="auth-tab" [class.active]="auth.authMode() === 'register'"
            (click)="auth.setAuthMode('register')">Rejestracja</button>
        </div>

        <!-- Form -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Adres e-mail</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" />
            <mat-icon matSuffix>alternate_email</mat-icon>
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
            <div class="auth-error">
              <mat-icon>error_outline</mat-icon>
              {{ auth.authError() }}
            </div>
          }

          <button mat-raised-button color="primary" type="submit"
            class="submit-btn"
            [disabled]="auth.isLoading() || form.invalid">
            @if (auth.isLoading()) {
              <mat-spinner diameter="20" />
            } @else {
              {{ auth.authMode() === 'login' ? 'Zaloguj się' : 'Zarejestruj się' }}
            }
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .auth-bg {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: var(--bg); padding: 20px;
    }
    .auth-card {
      width: 100%; max-width: 380px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 32px 28px;
      box-shadow: var(--shadow);
      animation: fadeUp .4s ease both;
    }
    .auth-header { text-align: center; margin-bottom: 28px; }
    .auth-logo {
      width: 64px; height: 64px; border-radius: 18px;
      background: var(--primary); margin: 0 auto 16px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 32px rgba(255,193,7,.4);
    }
    .auth-logo mat-icon { font-size: 32px; width: 32px; height: 32px; color: #12121f; }
    .auth-title { margin: 0 0 6px; font-size: 22px; font-weight: 700; color: var(--text); }
    .auth-subtitle { margin: 0; font-size: 13px; color: var(--text-muted); }
    .auth-tabs {
      display: flex; gap: 4px; padding: 4px;
      background: var(--surface-2); border-radius: 12px;
      margin-bottom: 24px;
    }
    .auth-tab {
      flex: 1; padding: 9px; border: none; cursor: pointer;
      border-radius: 9px; font-size: 13px; font-weight: 600;
      color: var(--text-muted); background: transparent;
      transition: all .2s; font-family: inherit;
    }
    .auth-tab.active {
      background: var(--primary); color: #12121f;
      box-shadow: 0 0 16px rgba(255,193,7,.35);
    }
    .auth-form { display: flex; flex-direction: column; gap: 4px; }
    .full-width { width: 100%; }
    .auth-error {
      display: flex; align-items: center; gap: 8px;
      background: rgba(244,63,94,.1); border: 1px solid rgba(244,63,94,.25);
      border-radius: 8px; padding: 10px 12px;
      color: #f43f5e; font-size: 13px;
    }
    .auth-error mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }
    .submit-btn {
      width: 100%; height: 48px; margin-top: 8px;
      font-size: 15px; font-weight: 700; letter-spacing: .04em;
      border-radius: 12px !important;
    }
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
