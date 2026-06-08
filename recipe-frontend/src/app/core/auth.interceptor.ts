import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const retriedAfterRefresh = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const accessToken = authService.getAccessToken();
  const request = shouldAttachAuthorization(req.url) && accessToken
    ? req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`
      }
    })
    : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!shouldAttemptRefresh(error, request)) {
        return throwError(() => error);
      }

      const hadAuthenticatedSession = authService.state().isAuthenticated;

      return authService.refresh().pipe(
        switchMap(() => {
          const refreshedAccessToken = authService.getAccessToken();

          if (!refreshedAccessToken) {
            authService.handleRefreshFailure(hadAuthenticatedSession);
            return throwError(() => error);
          }

          return next(request.clone({
            context: request.context.set(retriedAfterRefresh, true),
            setHeaders: {
              Authorization: `Bearer ${refreshedAccessToken}`
            }
          }));
        }),
        catchError((refreshError) => {
          authService.handleRefreshFailure(hadAuthenticatedSession);
          return throwError(() => refreshError);
        })
      );
    })
  );
};

function shouldAttachAuthorization(url: string): boolean {
  return !isAuthEndpoint(url);
}

function shouldAttemptRefresh(error: HttpErrorResponse, req: HttpRequest<unknown>): boolean {
  return error.status === 401
    && !req.context.get(retriedAfterRefresh)
    && !isAuthEndpoint(req.url);
}

function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/login')
    || url.includes('/auth/register')
    || url.includes('/auth/refresh')
    || url.includes('/auth/logout');
}
