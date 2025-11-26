/* eslint-disable @typescript-eslint/no-explicit-any */
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { environment } from "../../environments/environment";
@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private app: any;
  private analytics: any;
  private firestore: any;
  private auth: any;
  private platformId = inject<object>(PLATFORM_ID);
  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.app = initializeApp(environment.firebase);
      this.firestore = getFirestore(this.app);  
      this.auth = getAuth(this.app);
      isSupported().then(supported => {
        if (supported) {
          this.analytics = getAnalytics(this.app);
          console.log("🔥 Firebase Analytics đã được khởi tạo!");
        } else {
          console.warn("⚠️ Firebase Analytics không được hỗ trợ trên môi trường này!");
        }
      });
    } else {
      console.warn("⚠️ Firebase không được khởi tạo trên Server-Side Rendering!");
    }
  }
}
