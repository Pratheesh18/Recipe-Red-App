import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { apiBaseUrl } from './api.config';
import { AuthResponse, AuthState, RegisterResponse } from './models';

const tokenStorageKey = 'recipehub_token';
const legacyUserNameStorageKey = 'recipehub_user_name';
const legacyEmailStorageKey = 'recipehub_email';

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
    this.clearLegacyStorage();
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
    this.clearLegacyStorage();
    this.state.set(this.buildStateFromToken(response.token));
  }

  private readInitialState(): AuthState {
    this.clearLegacyStorage();
    const token = localStorage.getItem(tokenStorageKey);

    if (!token) {
      return this.createSignedOutState();
    }

    return this.buildStateFromToken(token);
  }

  private buildStateFromToken(token: string): AuthState {
    const payload = this.decodeTokenPayload(token);
    const userName =
      this.readStringClaim(payload, 'unique_name') ??
      this.readStringClaim(payload, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name');
    const email =
      this.readStringClaim(payload, 'email') ??
      this.readStringClaim(payload, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress');

    if (!payload || !userName) {
      localStorage.removeItem(tokenStorageKey);
      return this.createSignedOutState();
    }

    return {
      isAuthenticated: true,
      token,
      userName,
      email
    };
  }

  private decodeTokenPayload(token: string): Record<string, unknown> | null {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    try {
      const base64 = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');

      return JSON.parse(atob(base64)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private readStringClaim(payload: Record<string, unknown> | null, claimName: string): string | null {
    const value = payload?.[claimName];
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private createSignedOutState(): AuthState {
    return {
      isAuthenticated: false,
      token: null,
      userName: null,
      email: null
    };
  }

  private clearLegacyStorage(): void {
    localStorage.removeItem(legacyUserNameStorageKey);
    localStorage.removeItem(legacyEmailStorageKey);
  }
}
