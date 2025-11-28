/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { environment } from "../../../environments/environment";
import { getAuth } from "firebase/auth";
@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: any;
  private analytics: any;
  private firestore: any;
  private auth: any;
  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(@Inject(PLATFORM_ID) private platformId: object) {
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
