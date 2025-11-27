/* eslint-disable @typescript-eslint/no-explicit-any */
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { initializeApp, provideFirebaseApp, getApps } from '@angular/fire/app';
import { AuthModule, getAuth, provideAuth } from '@angular/fire/auth';
import { FirestoreModule, getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { ssrLoggingInterceptor } from './core/interceptors/ssr-logging.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Zone.js change detection - required for animations and SSR compatibility
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(
      withEventReplay()  
    ),
    provideAnimations(),
    provideHttpClient(
      withFetch(),
      withInterceptors([ssrLoggingInterceptor])
    ),
    // Firebase providers - wrapped with try-catch for SSR safety
    // These will be called but should handle SSR gracefully
    provideFirebaseApp(() => {
      // Check if running in browser before initializing
      if (typeof window === 'undefined') {
        // Return a dummy app for SSR - will be replaced on client
        return {} as any;
      }
      
      try {
        // Check if app already exists to avoid re-initialization
        try {
          const existingApps = getApps();
          if (existingApps.length > 0) {
            console.log('[app.config] Using existing Firebase App');
            return existingApps[0];
          }
        } catch (e) {
          // getApps might not be available, continue with initialization
        }
        
        // Initialize Firebase app
        const app = initializeApp(environment.firebase);
        console.log('[app.config] Firebase App initialized successfully');
        return app;
      } catch (error: any) {
        // If app already exists, try to get it
        if (error?.code === 'app/duplicate-app') {
          try {
            const existingApps = getApps();
            if (existingApps.length > 0) {
              console.log('[app.config] Using existing Firebase App (from duplicate error)');
              return existingApps[0];
            }
          } catch (e) {
            console.error('[app.config] Failed to get existing apps:', e);
          }
        }
        console.error('[app.config] Firebase initialization error:', error);
        // Don't return dummy object - throw error so Angular knows initialization failed
        // This will cause providers to retry
        throw error;
      }
    }),
    provideFirestore(() => {
      // Check for SSR FIRST before calling getFirestore()
      // getFirestore() internally calls getApp() which will throw if no app exists
      if (typeof window === 'undefined') {
        // Return a proper dummy Firestore object for SSR
        return {
          app: {} as any,
          type: 'firestore-lite',
          toJSON: () => ({}),
        } as any;
      }
      try {
        return getFirestore();
      } catch (error) {
        console.error('[app.config] Firestore initialization error:', error);
        // Return dummy object to prevent crash
        return {
          app: {} as any,
          type: 'firestore-lite',
          toJSON: () => ({}),
        } as any;
      }
    }),
    provideAuth(() => {
      // Check for SSR FIRST before calling getAuth()
      // getAuth() internally calls getApp() which will throw if no app exists
      if (typeof window === 'undefined' || typeof globalThis === 'undefined' || !globalThis.window) {
        // Return a minimal mock Auth object for SSR
        return {
          currentUser: null,
          app: {} as any,
          onAuthStateChanged: () => () => {},
          signOut: () => Promise.resolve(),
          signInWithEmailAndPassword: () => Promise.reject(new Error('Auth not available in SSR')),
          createUserWithEmailAndPassword: () => Promise.reject(new Error('Auth not available in SSR')),
        } as any;
      }
      try {
        // Check if Firebase app exists before calling getAuth()
        // getAuth() will use the default app initialized by provideFirebaseApp()
        const auth = getAuth();
        return auth;
      } catch (error: any) {
        // If getAuth() fails (e.g., no app initialized), return dummy object
        if (error?.code === 'app/no-app' || error?.message?.includes('No Firebase App')) {
          console.warn('[app.config] Firebase App not initialized yet, returning dummy Auth for SSR');
          return {
            currentUser: null,
            app: {} as any,
            onAuthStateChanged: () => () => {},
            signOut: () => Promise.resolve(),
            signInWithEmailAndPassword: () => Promise.reject(new Error('Auth not available in SSR')),
            createUserWithEmailAndPassword: () => Promise.reject(new Error('Auth not available in SSR')),
          } as any;
        }
        console.error('[app.config] Auth initialization error:', error);
        // Return dummy object to prevent crash
        return {
          currentUser: null,
          app: {} as any,
          onAuthStateChanged: () => () => {},
          signOut: () => Promise.resolve(),
          signInWithEmailAndPassword: () => Promise.reject(new Error('Auth not available in SSR')),
          createUserWithEmailAndPassword: () => Promise.reject(new Error('Auth not available in SSR')),
        } as any;
      }
    }),
    // Other modules - only import on browser
    ...(typeof window !== 'undefined' ? [
      importProvidersFrom(
        FirestoreModule,
        AuthModule
      )
    ] : [])
  ]
};
