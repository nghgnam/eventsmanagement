import { Injectable, OnDestroy } from '@angular/core';
import {
  Auth,
  EmailAuthProvider,
  User as FirebaseUser,
  GoogleAuthProvider,
  IdTokenResult,
  Unsubscribe,
  UserCredential,
  applyActionCode,
  browserLocalPersistence,
  browserSessionPersistence,
  checkActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  linkWithCredential,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  unlink,
  updateEmail,
  updateProfile,
  verifyBeforeUpdateEmail,
  verifyPasswordResetCode
} from 'firebase/auth';
import { Timestamp, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { BehaviorSubject, Observable, from, map, of, switchMap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { User, UserRole, UserType } from '../models/userstype';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private auth: Auth;
  private db = getFirestore();
  private tokenResult$ = new BehaviorSubject<IdTokenResult | null>(null);
  private tokenUnsubscribe: Unsubscribe | null = null;

  constructor() {
    this.auth = getAuth();
    // Listen to token changes
    this.tokenUnsubscribe = onIdTokenChanged(this.auth, async (user) => {
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          this.tokenResult$.next(tokenResult);
        } catch (error) {
          console.error('Error getting token result:', error);
        }
      } else {
        this.tokenResult$.next(null);
      }
    });
  }

  register(email: string, password: string, userType: UserType ="member" , role: UserRole = "user"): Observable<User> {
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap((userCredential: UserCredential) => {
        const firebaseUser = userCredential.user;
  
        const now = Timestamp.now();
        const defaultUser: User = {
          id: firebaseUser.uid,
          account: {
            username: '',
            email: firebaseUser.email ?? '',
            role,
            type: userType,
            status: 'active'
          },
          profile: {
            fullName: '',
            firstName: '',
            lastName: '',
            avatar: '',
            dob: now,
            age: 0,
            gender: null
          },
          contact: {
            phone: '',
            address: {
              details_address: '',
              wards: '',
              districts: '',
              city: '',
              country: ''
            },
            currentLocation: null
          },
          organization: userType === 'organizer'
            ? {
                companyName: '',
                identifier: '',
                jobTitle: '',
                postalCode: ''
              }
            : null,
          security: {
            password: '',
            lastLogin: now,
            blacklist: null
          },
          social: {
            followers: 0,
            following: [],
            preferences: {}
          },
          metadata: {},
          timestamps: {
            createdAt: now,
            updatedAt: now
          }
        };
  
        return from(setDoc(doc(this.db, "users", firebaseUser.uid), defaultUser)).pipe(
          switchMap(() => {
            // Use enhanced email verification with custom redirect
            const continueUrl = `${window.location.origin}/auth/email-verified`;
            return from(sendEmailVerification(firebaseUser, {
              url: continueUrl,
              handleCodeInApp: true,
            })).pipe(
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

  login(email: string, password: string): Observable<string> {
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

  googleSignIn(): Observable<UserCredential> {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    return from(signInWithPopup(this.auth, provider)).pipe(
      switchMap((userCredential: UserCredential) => {
        const firebaseUser = userCredential.user;
        
        // Check if user exists in Firestore, if not create
        return from(getDoc(doc(this.db, 'users', firebaseUser.uid))).pipe(
          switchMap(userDoc => {
            if (!userDoc.exists()) {
              // Create user in Firestore
              const now = Timestamp.now();
              const defaultUser: User = {
                id: firebaseUser.uid,
                account: {
                  username: firebaseUser.displayName || '',
                  email: firebaseUser.email ?? '',
                  role: 'user',
                  type: 'member',
                  status: 'active'
                },
                profile: {
                  fullName: firebaseUser.displayName || '',
                  firstName: firebaseUser.displayName?.split(' ')[0] || '',
                  lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
                  avatar: firebaseUser.photoURL || '',
                  dob: now,
                  age: null,
                  gender: null
                },
                contact: {
                  phone: null,
                  address: null,
                  currentLocation: null
                },
                organization: null,
                security: {
                  password: null,
                  lastLogin: now,
                  blacklist: null
                },
                social: {
                  followers: 0,
                  following: [],
                  preferences: {}
                },
                metadata: {},
                timestamps: {
                  createdAt: now,
                  updatedAt: now
                }
              };
              
              return from(setDoc(doc(this.db, 'users', firebaseUser.uid), defaultUser)).pipe(
                map(() => userCredential)
              );
            }
            return of(userCredential);
          }),
          catchError(() => of(userCredential))
        );
      }),
      catchError(error => {
        console.error('Google sign in error:', error);
        let errorMessage = 'Failed to sign in with Google.';
        
        switch (error.code) {
          case 'auth/popup-closed-by-user':
            errorMessage = 'Sign-in popup was closed. Please try again.';
            break;
          case 'auth/popup-blocked':
            errorMessage = 'Popup was blocked. Please allow popups for this site.';
            break;
          case 'auth/account-exists-with-different-credential':
            errorMessage = 'An account already exists with this email. Please sign in with your password.';
            break;
        }
        
        return throwError(() => ({ code: error.code, message: errorMessage }));
      })
    );
  }

  // ==================== TOKEN MANAGEMENT ====================

  /**
   * Get ID Token with optional force refresh
   */
  getIdToken(forceRefresh: boolean = false): Observable<string> {
    const user = this.auth.currentUser;
    if (!user) {
      return throwError(() => ({ code: 'auth/no-user', message: 'No user is currently signed in.' }));
    }
    
    return from(user.getIdToken(forceRefresh));
  }

  /**
   * Get ID Token Result (includes claims, expiration, etc.)
   */
  getIdTokenResult(forceRefresh: boolean = false): Observable<IdTokenResult> {
    const user = this.auth.currentUser;
    if (!user) {
      return throwError(() => ({ code: 'auth/no-user', message: 'No user is currently signed in.' }));
    }
    
    return from(user.getIdTokenResult(forceRefresh));
  }

  /**
   * Get current token result (from BehaviorSubject)
   */
  getCurrentTokenResult(): Observable<IdTokenResult | null> {
    return this.tokenResult$.asObservable();
  }

  /**
   * Check if user has specific custom claim
   */
  hasClaim(claim: string): Observable<boolean> {
    return this.getIdTokenResult().pipe(
      map(tokenResult => {
        return !!tokenResult.claims[claim];
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Get user role from custom claims
   */
  getUserRole(): Observable<string | null> {
    return this.getIdTokenResult().pipe(
      map(tokenResult => {
        return (tokenResult.claims['role'] as string) || null;
      }),
      catchError(() => of(null))
    );
  }

  // ==================== EMAIL VERIFICATION NÂNG CAO ====================

  /**
   * Send email verification with custom settings
   */
  sendEmailVerificationWithSettings(
    user: FirebaseUser,
    continueUrl?: string
  ): Observable<void> {
    const actionCodeSettings = continueUrl ? {
      url: continueUrl,
      handleCodeInApp: true,
    } : undefined;

    return from(sendEmailVerification(user, actionCodeSettings)).pipe(
      catchError(error => {
        console.error('Email verification error:', error);
        return throwError(() => ({ code: error.code, message: 'Failed to send verification email.' }));
      })
    );
  }

  /**
   * Apply action code (verify email, reset password, etc.)
   */
  applyActionCode(code: string): Observable<void> {
    return from(applyActionCode(this.auth, code)).pipe(
      catchError(error => {
        console.error('Apply action code error:', error);
        let errorMessage = 'Failed to verify code.';
        
        switch (error.code) {
          case 'auth/invalid-action-code':
            errorMessage = 'Invalid or expired code.';
            break;
          case 'auth/expired-action-code':
            errorMessage = 'Code has expired. Please request a new one.';
            break;
        }
        
        return throwError(() => ({ code: error.code, message: errorMessage }));
      })
    );
  }

  /**
   * Check action code before applying
   */
  checkActionCode(code: string): Observable<unknown> {
    return from(checkActionCode(this.auth, code)).pipe(
      catchError(error => {
        console.error('Check action code error:', error);
        return throwError(() => ({ code: error.code, message: 'Invalid code.' }));
      })
    );
  }

  // ==================== PASSWORD RESET HOÀN CHỈNH ====================

  /**
   * Send password reset email with custom settings
   */
  sendPasswordResetEmailWithSettings(
    email: string,
    continueUrl?: string
  ): Observable<void> {
    const actionCodeSettings = continueUrl ? {
      url: continueUrl,
      handleCodeInApp: true,
    } : undefined;

    return from(sendPasswordResetEmail(this.auth, email, actionCodeSettings)).pipe(
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

  /**
   * Verify password reset code
   */
  verifyPasswordResetCode(code: string): Observable<string> {
    return from(verifyPasswordResetCode(this.auth, code)).pipe(
      catchError(error => {
        console.error('Verify password reset code error:', error);
        let errorMessage = 'Invalid or expired reset code.';
        
        switch (error.code) {
          case 'auth/invalid-action-code':
            errorMessage = 'Invalid reset code.';
            break;
          case 'auth/expired-action-code':
            errorMessage = 'Reset code has expired. Please request a new one.';
            break;
        }
        
        return throwError(() => ({ code: error.code, message: errorMessage }));
      })
    );
  }

  /**
   * Confirm password reset with code
   */
  confirmPasswordReset(code: string, newPassword: string): Observable<void> {
    return from(confirmPasswordReset(this.auth, code, newPassword)).pipe(
      catchError(error => {
        console.error('Confirm password reset error:', error);
        let errorMessage = 'Failed to reset password.';
        
        switch (error.code) {
          case 'auth/invalid-action-code':
            errorMessage = 'Invalid or expired reset code.';
            break;
          case 'auth/weak-password':
            errorMessage = 'The password is too weak.';
            break;
        }
        
        return throwError(() => ({ code: error.code, message: errorMessage }));
      })
    );
  }

  // ==================== PROFILE MANAGEMENT ====================

  /**
   * Update user profile (displayName, photoURL)
   */
  updateUserProfile(displayName?: string, photoURL?: string): Observable<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return throwError(() => ({ code: 'auth/no-user', message: 'No user is currently signed in.' }));
    }

    const updates: { displayName?: string; photoURL?: string } = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (photoURL !== undefined) updates.photoURL = photoURL;

    return from(updateProfile(user, updates)).pipe(
      catchError(error => {
        console.error('Update profile error:', error);
        return throwError(() => ({ code: error.code, message: 'Failed to update profile.' }));
      })
    );
  }

  /**
   * Update user email
   */
  updateUserEmail(newEmail: string): Observable<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return throwError(() => ({ code: 'auth/no-user', message: 'No user is currently signed in.' }));
    }

    return from(updateEmail(user, newEmail)).pipe(
      catchError(error => {
        console.error('Update email error:', error);
        let errorMessage = 'Failed to update email.';
        
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already in use.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address.';
            break;
          case 'auth/requires-recent-login':
            errorMessage = 'Please re-authenticate before changing email.';
            break;
        }
        
        return throwError(() => ({ code: error.code, message: errorMessage }));
      })
    );
  }

  /**
   * Verify email before updating
   */
  verifyBeforeUpdateEmail(newEmail: string, continueUrl?: string): Observable<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return throwError(() => ({ code: 'auth/no-user', message: 'No user is currently signed in.' }));
    }

    const actionCodeSettings = continueUrl ? {
      url: continueUrl,
      handleCodeInApp: true,
    } : undefined;

    return from(verifyBeforeUpdateEmail(user, newEmail, actionCodeSettings)).pipe(
      catchError(error => {
        console.error('Verify before update email error:', error);
        return throwError(() => ({ code: error.code, message: 'Failed to send verification email.' }));
      })
    );
  }

  // ==================== ACCOUNT MANAGEMENT ====================

  /**
   * Delete user account
   */
  deleteAccount(): Observable<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return throwError(() => ({ code: 'auth/no-user', message: 'No user is currently signed in.' }));
    }

    return from(deleteUser(user)).pipe(
      catchError(error => {
        console.error('Delete account error:', error);
        let errorMessage = 'Failed to delete account.';
        
        switch (error.code) {
          case 'auth/requires-recent-login':
            errorMessage = 'Please re-authenticate before deleting account.';
            break;
        }
        
        return throwError(() => ({ code: error.code, message: errorMessage }));
      })
    );
  }

  /**
   * Link account with credential
   */
  linkAccount(email: string, password: string): Observable<UserCredential> {
    const user = this.auth.currentUser;
    if (!user) {
      return throwError(() => ({ code: 'auth/no-user', message: 'No user is currently signed in.' }));
    }

    const credential = EmailAuthProvider.credential(email, password);
    
    return from(linkWithCredential(user, credential)).pipe(
      catchError(error => {
        console.error('Link account error:', error);
        let errorMessage = 'Failed to link account.';
        
        switch (error.code) {
          case 'auth/credential-already-in-use':
            errorMessage = 'This credential is already associated with another account.';
            break;
          case 'auth/invalid-credential':
            errorMessage = 'Invalid email or password.';
            break;
        }
        
        return throwError(() => ({ code: error.code, message: errorMessage }));
      })
    );
  }

  /**
   * Link Google account
   */
  linkGoogleAccount(): Observable<UserCredential> {
    const user = this.auth.currentUser;
    if (!user) {
      return throwError(() => ({ code: 'auth/no-user', message: 'No user is currently signed in.' }));
    }

    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    // Use signInWithPopup to get credential, then link
    return from(signInWithPopup(this.auth, provider)).pipe(
      switchMap((userCredential) => {
        // Get credential from userCredential
        const credential = GoogleAuthProvider.credentialFromResult(userCredential);
        if (!credential) {
          return throwError(() => ({ code: 'auth/invalid-credential', message: 'Failed to get credential from Google sign in.' }));
        }
        // Link the credential to current user
        return from(linkWithCredential(user, credential)).pipe(
          map(() => userCredential)
        );
      }),
      catchError(error => {
        console.error('Link Google account error:', error);
        let errorMessage = 'Failed to link Google account.';
        
        switch (error.code) {
          case 'auth/credential-already-in-use':
            errorMessage = 'This Google account is already associated with another account.';
            break;
          case 'auth/popup-closed-by-user':
            errorMessage = 'Popup was closed. Please try again.';
            break;
        }
        
        return throwError(() => ({ code: error.code, message: errorMessage }));
      })
    );
  }

  /**
   * Unlink provider
   */
  unlinkProvider(providerId: string): Observable<FirebaseUser> {
    const user = this.auth.currentUser;
    if (!user) {
      return throwError(() => ({ code: 'auth/no-user', message: 'No user is currently signed in.' }));
    }

    return from(unlink(user, providerId)).pipe(
      catchError(error => {
        console.error('Unlink provider error:', error);
        return throwError(() => ({ code: error.code, message: 'Failed to unlink provider.' }));
      })
    );
  }

  // ==================== AUTH PERSISTENCE ====================

  /**
   * Set auth persistence
   */
  setAuthPersistence(persistence: 'local' | 'session' | 'none'): Observable<void> {
    let persistenceType;
    switch (persistence) {
      case 'local':
        persistenceType = browserLocalPersistence;
        break;
      case 'session':
        persistenceType = browserSessionPersistence;
        break;
      case 'none':
        // Note: inMemoryPersistence may not be available in all versions
        persistenceType = browserSessionPersistence; // Fallback to session
        break;
      default:
        persistenceType = browserLocalPersistence;
    }

    return from(setPersistence(this.auth, persistenceType)).pipe(
      catchError(error => {
        console.error('Set persistence error:', error);
        return throwError(() => ({ code: error.code, message: 'Failed to set persistence.' }));
      })
    );
  }

  /**
   * Get current auth persistence
   * Note: Firebase Auth v10 doesn't have getPersistence, default is 'local'
   */
  getAuthPersistence(): Observable<string> {
    // Firebase Auth v10 uses local persistence by default
    // We can't directly get it, but we can return default
    return of('local');
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get current Firebase user
   */
  getCurrentFirebaseUser(): FirebaseUser | null {
    return this.auth.currentUser;
  }

  /**
   * Reload current user
   */
  reloadUser(): Observable<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return throwError(() => ({ code: 'auth/no-user', message: 'No user is currently signed in.' }));
    }

    return from(user.reload()).pipe(
      catchError(error => {
        console.error('Reload user error:', error);
        return throwError(() => ({ code: error.code, message: 'Failed to reload user.' }));
      })
    );
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    if (this.tokenUnsubscribe) {
      this.tokenUnsubscribe();
      this.tokenUnsubscribe = null;
    }
  }

}
