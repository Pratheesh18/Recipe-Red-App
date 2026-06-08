import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { apiBaseUrl } from './api.config';
import { AuthResponse, AuthState, RegisterResponse } from './models';

const tokenStorageKey = 'recipehub_token';
const userNameStorageKey = 'recipehub_user_name';
const emailStorageKey = 'recipehub_email';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly state = signal<AuthState>(this.readInitialState());

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  register(payload: { username: string; email: string; password: string }) {
    return this.http.post<RegisterResponse>(`${apiBaseUrl}/auth/register`, payload);
  }

  login(payload: { email: string; password: string }) {
    return this.http
      .post<AuthResponse>(`${apiBaseUrl}/auth/login`, payload)
      .pipe(tap((response) => this.persistSession(response)));
  }

  logout(): void {
    localStorage.removeItem(tokenStorageKey);
    localStorage.removeItem(userNameStorageKey);
    localStorage.removeItem(emailStorageKey);
    this.state.set({
      isAuthenticated: false,
      token: null,
      userName: null,
      email: null
    });
    void this.router.navigateByUrl('/login');
  }

  getToken(): string | null {
    return this.state().token;
  }

  private persistSession(response: AuthResponse): void {
    localStorage.setItem(tokenStorageKey, response.token);
    localStorage.setItem(userNameStorageKey, response.userName);
    localStorage.setItem(emailStorageKey, response.email);

    this.state.set({
      isAuthenticated: true,
      token: response.token,
      userName: response.userName,
      email: response.email
    });
  }

  private readInitialState(): AuthState {
    const token = localStorage.getItem(tokenStorageKey);
    const userName = localStorage.getItem(userNameStorageKey);
    const email = localStorage.getItem(emailStorageKey);

    return {
      isAuthenticated: Boolean(token),
      token,
      userName,
      email
    };
  }
}
