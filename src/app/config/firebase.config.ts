import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { environment } from "../../environments/environment";

// Initialize Firebase only once
const firebaseApp = initializeApp(environment.firebase);

// Export Firebase services
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// Export the app instance for reuse
export { firebaseApp };
