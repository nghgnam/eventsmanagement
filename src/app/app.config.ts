import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { AuthModule, getAuth, provideAuth } from '@angular/fire/auth';
import { FirestoreModule, getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Zoneless new form update Angular v20
    provideRouter(routes),
    provideClientHydration(
      withEventReplay()  
    ),
    provideAnimations(),
    provideHttpClient(withFetch()),
    // Firebase providers - must be outside importProvidersFrom
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    // Other modules
    importProvidersFrom(
      FirestoreModule,
      AuthModule
    )
  ]
};
