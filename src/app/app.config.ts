import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { environment } from '../environments/environment';
import { FirestoreModule } from '@angular/fire/firestore';
import { AuthModule } from '@angular/fire/auth';

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
