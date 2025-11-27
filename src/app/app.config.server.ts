/* eslint-disable @typescript-eslint/no-explicit-any */
import { mergeApplicationConfig, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';
import { provideAuth } from '@angular/fire/auth';
import { provideFirebaseApp } from '@angular/fire/app';
import { provideFirestore } from '@angular/fire/firestore';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    // SSR requires Zone.js even in zoneless applications
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Override Firebase providers with SSR-safe dummy implementations
    // This ensures they are not initialized during SSR
    // These MUST be provided here to override the client config
    provideFirebaseApp(() => {
      // Return dummy app for SSR - must be a valid object structure
      return {
        name: '[DEFAULT]',
        options: {},
        automaticDataCollectionEnabled: false,
      } as any;
    }),
    provideFirestore(() => {
      // Return dummy Firestore for SSR with proper structure
      return {
        app: {
          name: '[DEFAULT]',
          options: {},
          automaticDataCollectionEnabled: false,
        } as any,
        type: 'firestore-lite',
        toJSON: () => ({}),
      } as any;
    }),
    provideAuth(() => {
      // Return dummy Auth for SSR with minimal interface
      return {
        currentUser: null,
        app: {
          name: '[DEFAULT]',
          options: {},
          automaticDataCollectionEnabled: false,
        } as any,
        onAuthStateChanged: () => () => {},
        signOut: () => Promise.resolve(),
        signInWithEmailAndPassword: () => Promise.reject(new Error('Auth not available in SSR')),
        createUserWithEmailAndPassword: () => Promise.reject(new Error('Auth not available in SSR')),
      } as any;
    })
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
