import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from '@angular/fire/auth';
import { DataService } from './data.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);
  private data = inject(DataService);

  readonly user = signal<User | null>(null);
  readonly authMode = signal<'login' | 'register'>('login');
  readonly authError = signal<string>('');
  readonly isLoading = signal<boolean>(false);

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.user.set(user);
      if (user) {
        this.data.loadData(user.uid);
        this.router.navigate(['/catalog']);
      } else {
        this.data.clear();
        this.router.navigate(['/login']);
      }
    });
  }

  async login(email: string, password: string): Promise<void> {
    this.isLoading.set(true);
    this.authError.set('');
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
    } catch (e: any) {
      this.authError.set(this.translateError(e.code));
    } finally {
      this.isLoading.set(false);
    }
  }

  async register(email: string, password: string): Promise<void> {
    this.isLoading.set(true);
    this.authError.set('');
    try {
      await createUserWithEmailAndPassword(this.auth, email, password);
    } catch (e: any) {
      this.authError.set(this.translateError(e.code));
    } finally {
      this.isLoading.set(false);
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }

  setAuthMode(mode: 'login' | 'register'): void {
    this.authMode.set(mode);
    this.authError.set('');
  }

  translateError(code: string): string {
    const map: Record<string, string> = {
      'auth/user-not-found': 'Nie ma konta z tym emailem',
      'auth/wrong-password': 'Błędne hasło',
      'auth/email-already-in-use': 'Ten email jest już zarejestrowany',
      'auth/weak-password': 'Hasło musi mieć minimum 6 znaków',
      'auth/invalid-email': 'Nieprawidłowy adres email',
      'auth/too-many-requests': 'Za dużo prób — odczekaj chwilę',
      'auth/invalid-credential': 'Błędny email lub hasło',
    };
    return map[code] ?? 'Wystąpił błąd, spróbuj ponownie';
  }
}
