import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap, catchError, finalize } from 'rxjs';
import { SSRLoggerService } from '../services/ssr-logger.service';

/**
 * HTTP Interceptor để log tất cả HTTP requests trong SSR
 * Giúp debug timeout issues
 */
export const ssrLoggingInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const platformId = inject(PLATFORM_ID);
  const logger = inject(SSRLoggerService);
  const isBrowser = isPlatformBrowser(platformId);
  
  // Use Date.now() for SSR compatibility (performance.now() may not be available)
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  // Use urlWithParams so logs show query params (category, tags, page, ...)
  const requestUrl = req.urlWithParams || req.url;
  const requestId = `${req.method}-${requestUrl}-${Date.now()}`;
  
  // Only log on browser to avoid SSR noise
  if (isBrowser) {
    logger.debug(`HTTP Request started`, {
      method: req.method,
      url: requestUrl,
      headers: Object.keys(req.headers.keys())
    }, undefined, 'HttpInterceptor');
    
    logger.startTimer(requestId);
  }
  
  return next(req).pipe(
    tap({
      next: (event) => {
        // Log successful response - only on browser
        if (isBrowser && event.type === 4) { // HttpResponse
          const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
          logger.logHttpRequest(
            req.method,
            requestUrl,
            (event as unknown as { status: number }).status,
            duration,
            undefined,
            undefined,
            'HttpInterceptor'
          );
        }
      },
      error: (error) => {
        // Log error - only on browser
        if (isBrowser) {
          const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
          logger.logHttpRequest(
            req.method,
            requestUrl,
            error.status || 0,
            duration,
            error,
            undefined,
            'HttpInterceptor'
          );
        }
      }
    }),
    catchError((error) => {
      // Only log on browser
      if (isBrowser) {
        const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
        logger.error(
          `HTTP Request failed: ${req.method} ${requestUrl}`,
          {
            error: error.message,
            status: error.status,
            duration: `${duration}ms`
          },
          undefined,
          'HttpInterceptor'
        );
      }
      throw error;
    }),
    finalize(() => {
      // Only log on browser
      if (isBrowser) {
        logger.endTimer(requestId, `HTTP Request completed: ${req.method} ${requestUrl}`, undefined, 'HttpInterceptor');
      }
    })
  );
};

