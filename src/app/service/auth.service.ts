import { HttpClient } from '@angular/common/http';
import { from, map, switchMap, Observable, throwError } from 'rxjs';
import { Injectable } from '@angular/core';
import { getAuth, createUserWithEmailAndPassword, Auth, UserCredential, sendEmailVerification, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { environment } from '../../environments/environment';
import { Member, Organizer, User, UserRole, UserType } from '../types/userstype';
import { addDoc, collection, doc, getFirestore, setDoc, Timestamp } from 'firebase/firestore';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth: Auth;
  private db = getFirestore();

  constructor() {
    this.auth = getAuth();
  }

  register(email: string, password: string, userType: UserType ="member" , role: UserRole = "user"): Observable<User> {
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap((userCredential: UserCredential) => {
        const firebaseUser = userCredential.user;
  
        let defaultUser: User;
  
        if (userType === "organizer") {
          defaultUser = {
            id: firebaseUser.uid,
            fullName: "",
            username: "",
            age: 0,
            dateOfBirth: Timestamp.now(),
            address: { street: "", city: "", country: "" },
            email: firebaseUser.email ?? "",
            phoneNumber: "",
            profileImage: "",
            role: role,
            type: "organizer",
            companyName: "",
            identifierCode: "",
            currentJob: "",
            postalCode: "",
          } as unknown as Organizer;
        } else {
          defaultUser = {
            id: firebaseUser.uid,
            fullName: "",
            username: "",
            age: 0,
            dateOfBirth: Timestamp.now(),
            address: { street: "", city: "", country: "" },
            email: firebaseUser.email ?? "",
            phoneNumber: "",
            profileImage: "",
            role: role,
            type: "member",
          } as unknown as Member;
        }
  
        return from(setDoc(doc(this.db, "users", firebaseUser.uid), defaultUser)).pipe(
          switchMap(() => {
            return from(sendEmailVerification(firebaseUser)).pipe(
              map(() => defaultUser)
            );
          })
        );
      }),
      catchError(error => {
        console.error('Registration error:', error);
        let errorMessage = 'An error occurred during registration.';
        
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already registered. Please use a different email or try logging in.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'The email address is not valid.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Email/password accounts are not enabled. Please contact support.';
            break;
          case 'auth/weak-password':
            errorMessage = 'The password is too weak. Please use a stronger password.';
            break;
        }
        
        return throwError(() => ({ code: error.code, message: errorMessage }));
      })
    );
  }

  login(email: string, password: string): Observable<String> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap((userCredential: UserCredential) => {
        return from(userCredential.user.getIdToken());
      }),
      catchError(error => {
        console.error('Login error:', error);
        let errorMessage = 'An error occurred during login.';
        
        switch (error.code) {
          case 'auth/invalid-credential':
            errorMessage = 'Invalid email or password. Please try again.';
            break;
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed login attempts. Please try again later.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled.';
            break;
          case 'auth/email-not-verified':
            errorMessage = 'Please verify your email before logging in.';
            break;
        }
        
        return throwError(() => ({ code: error.code, message: errorMessage }));
      })
    );
  }

  logout(): Observable<void> {
    return from(signOut(this.auth)).pipe(
      catchError(error => {
        console.error('Logout error:', error);
        return throwError(() => ({ code: error.code, message: 'An error occurred during logout.' }));
      })
    );
  }

  resetPassword(email: string): Observable<void> {
    return from(sendPasswordResetEmail(this.auth, email)).pipe(
      catchError(error => {
        console.error('Password reset error:', error);
        let errorMessage = 'An error occurred while sending the password reset email.';
        
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'The email address is not valid.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many requests. Please try again later.';
            break;
        }
        
        return throwError(() => ({ code: error.code, message: errorMessage }));
      })
    );
  }

  resendVerificationEmail(): Observable<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return throwError(() => ({ code: 'auth/no-user', message: 'No user is currently signed in.' }));
    }
    
    return from(sendEmailVerification(user)).pipe(
      catchError(error => {
        console.error('Verification email error:', error);
        return throwError(() => ({ code: error.code, message: 'Failed to send verification email.' }));
      })
    );
  }
}
