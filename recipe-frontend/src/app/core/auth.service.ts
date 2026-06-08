import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { apiBaseUrl } from './api.config';
import { AuthResponse, AuthState, RegisterResponse } from './models';

const accessTokenStorageKey = 'recipehub_token';
const legacyUserNameStorageKey = 'recipehub_user_name';
const legacyEmailStorageKey = 'recipehub_email';
const accessTokenExpiryBufferSeconds = 30;

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly state = signal<AuthState>(this.readInitialState());
  private refreshRequest$: Observable<AuthState> | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  register(payload: { username: string; email: string; password: string }) {
    return this.http.post<RegisterResponse>(`${apiBaseUrl}/auth/register`, payload);
  }

  login(payload: { email: string; password: string }) {
    return this.http
      .post<AuthResponse>(`${apiBaseUrl}/auth/login`, payload, {
        withCredentials: true
      })
      .pipe(tap((response) => this.persistSession(response)));
  }

  refresh(): Observable<AuthState> {
    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    this.refreshRequest$ = this.http
      .post<AuthResponse>(`${apiBaseUrl}/auth/refresh`, {}, {
        withCredentials: true
      })
      .pipe(
        tap((response) => this.persistSession(response)),
        map(() => this.state()),
        catchError((error) => {
          this.clearSession(false);
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshRequest$ = null;
        }),
        shareReplay(1)
      );

    return this.refreshRequest$;
  }

  restoreSession(): void {
    const accessToken = this.state().accessToken;

    if (accessToken && !this.isAccessTokenExpired(accessToken)) {
      return;
    }

    this.refresh().subscribe({
      error: () => {
        this.clearSession(false);
      }
    });
  }

  logout(): void {
    this.clearSession(false);

    this.http.post<void>(`${apiBaseUrl}/auth/logout`, {}, {
      withCredentials: true
    })
      .pipe(catchError(() => of(void 0)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/login');
        }
      });
  }

  handleRefreshFailure(redirectToLogin: boolean): void {
    this.clearSession(false);

    if (redirectToLogin) {
      void this.router.navigateByUrl('/login');
    }
  }

  getAccessToken(): string | null {
    const accessToken = this.state().accessToken;
    return accessToken && !this.isAccessTokenExpired(accessToken)
      ? accessToken
      : null;
  }

  private persistSession(response: AuthResponse): void {
    localStorage.setItem(accessTokenStorageKey, response.accessToken);
    this.clearLegacyStorage();
    this.state.set(this.buildStateFromAccessToken(response.accessToken));
  }

  private readInitialState(): AuthState {
    this.clearLegacyStorage();
    const accessToken = localStorage.getItem(accessTokenStorageKey);

    if (!accessToken) {
      return this.createSignedOutState();
    }

    if (this.isAccessTokenExpired(accessToken)) {
      localStorage.removeItem(accessTokenStorageKey);
      return this.createSignedOutState();
    }

    return this.buildStateFromAccessToken(accessToken);
  }

  private buildStateFromAccessToken(accessToken: string): AuthState {
    const payload = this.decodeTokenPayload(accessToken);
    const userName =
      this.readStringClaim(payload, 'unique_name') ??
      this.readStringClaim(payload, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name');
    const email =
      this.readStringClaim(payload, 'email') ??
      this.readStringClaim(payload, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress');

    if (!payload || !userName) {
      localStorage.removeItem(accessTokenStorageKey);
      return this.createSignedOutState();
    }

    return {
      isAuthenticated: true,
      accessToken,
      userName,
      email
    };
  }

  private isAccessTokenExpired(accessToken: string): boolean {
    const payload = this.decodeTokenPayload(accessToken);
    const expiry = payload?.['exp'];

    if (typeof expiry !== 'number') {
      return true;
    }

    const currentUnixSeconds = Math.floor(Date.now() / 1000);
    return expiry <= currentUnixSeconds + accessTokenExpiryBufferSeconds;
  }

  private decodeTokenPayload(accessToken: string): Record<string, unknown> | null {
    const parts = accessToken.split('.');

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

  private clearSession(redirectToLogin: boolean): void {
    localStorage.removeItem(accessTokenStorageKey);
    this.clearLegacyStorage();
    this.state.set(this.createSignedOutState());

    if (redirectToLogin) {
      void this.router.navigateByUrl('/login');
    }
  }

  private createSignedOutState(): AuthState {
    return {
      isAuthenticated: false,
      accessToken: null,
      userName: null,
      email: null
    };
  }

  private clearLegacyStorage(): void {
    localStorage.removeItem(legacyUserNameStorageKey);
    localStorage.removeItem(legacyEmailStorageKey);
  }
}
