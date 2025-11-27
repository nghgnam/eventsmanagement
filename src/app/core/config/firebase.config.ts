import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { environment } from "../../../environments/environment";

// Only initialize Firebase on browser (not during SSR)
let firebaseApp: ReturnType<typeof initializeApp> | null = null;
let authInstance: ReturnType<typeof getAuth> | null = null;
let dbInstance: ReturnType<typeof getFirestore> | null = null;

// Lazy initialization functions
function initFirebase() {
  if (typeof window === 'undefined') {
    // During SSR, return dummy objects that will throw if used
    return {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      auth: null as any,
      /* eslint-disable @typescript-eslint/no-explicit-any */
      db: null as any
    };
  }
  
  if (!firebaseApp) {
    firebaseApp = initializeApp(environment.firebase);
    authInstance = getAuth(firebaseApp);
    dbInstance = getFirestore(firebaseApp);
  }
  
  return {
    auth: authInstance!,
    db: dbInstance!
  };
}

// Export getters that lazily initialize
export const auth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_target, prop) {
    const { auth: authInst } = initFirebase();
    if (!authInst) {
      throw new Error('Firebase Auth can only be accessed in browser environment');
    }
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const value = (authInst as any)[prop];
    return typeof value === 'function' ? value.bind(authInst) : value;
  }
});

export const db = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_target, prop) {
    const { db: dbInst } = initFirebase();
    if (!dbInst) {
      throw new Error('Firestore can only be accessed in browser environment');
    }
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const value = (dbInst as any)[prop];
    return typeof value === 'function' ? value.bind(dbInst) : value;
  }
});

// Export the app instance for reuse
export function getFirebaseAppInstance() {
  if (typeof window === 'undefined') {
    throw new Error('Firebase App can only be accessed in browser environment');
  }
  if (!firebaseApp) {
    firebaseApp = initializeApp(environment.firebase);
  }
  return firebaseApp;
}
