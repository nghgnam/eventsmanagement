/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { environment } from './environments/environment';

// Helper function để lấy các providers mặc định cho tests
// Sử dụng trong beforeEach của các spec files:
// import { getTestBedProviders } from '../../test-setup';
// beforeEach(async () => {
//   await TestBed.configureTestingModule({
//     imports: [YourComponent],
//     providers: getTestBedProviders()
//   }).compileComponents();
// });
export function getTestBedProviders(additionalProviders: any[] = []): any[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideRouter([]),
    provideAnimations(),
    provideFirebaseApp(() => initializeApp(environment.firebase || {})),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    {
      provide: ActivatedRoute,
      useValue: {
        snapshot: { params: {}, queryParams: {}, data: {} },
        params: {},
        queryParams: {},
        data: {}
      }
    },
    ...additionalProviders
  ];
}

// Deprecated: Sử dụng getTestBedProviders() thay vì configureTestBedProviders()
// Giữ lại để tương thích với các files đã cập nhật
export function configureTestBedProviders(additionalProviders: any[] = []) {
  TestBed.configureTestingModule({
    providers: getTestBedProviders(additionalProviders)
  });
}

