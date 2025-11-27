/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, ParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
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
        snapshot: { 
          params: {}, 
          queryParams: {}, 
          data: {},
          paramMap: {
            get: (key: string) => null,
            has: (key: string) => false,
            getAll: (key: string) => [],
            keys: []
          }
        },
        params: of({}),
        queryParams: of({}),
        paramMap: of({
          get: (key: string) => null,
          has: (key: string) => false,
          getAll: (key: string) => [],
          keys: []
        } as ParamMap),
        data: of({})
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

