import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, PLATFORM_ID, DestroyRef, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-register-action-demo',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    ReactiveFormsModule, 
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './register-action-demo.component.html',
  styleUrls: ['./register-action-demo.component.css']
})
export class RegisterActionDemoComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  registerForm: FormGroup;
  showPassword: boolean = false;
  showToast: boolean = false;
  private emailVerificationCheckInterval: number | undefined;
  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);
  isGoogleLoading = signal<boolean>(false);

  constructor() {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      repassword: ['', [Validators.required, Validators.minLength(6)]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Only check auth state on browser, not during SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // Check if user is already logged in using AuthService
    this.authService.onAuthStateChanged().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (user) => {
        if (user) {
          this.router.navigate(['/home']);
        }
      },
      error: (error) => {
        console.error('[RegisterComponent] Auth state error:', error);
        // Don't block the UI if auth check fails
      }
    });
  }

  ngOnDestroy(): void {
    if (this.emailVerificationCheckInterval) {
      clearInterval(this.emailVerificationCheckInterval);
    }
  }

  // Custom validator to check if passwords match
  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('repassword')?.value
      ? null
      : { mismatch: true };
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  checkEmailVerified(email: string, password: string): void {
    this.authService.login(email, password).subscribe({
      next: () => {
        // Check email verification using AuthService
        this.authService.onAuthStateChanged().pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: (user) => {
            if (user?.emailVerified) {
              console.log("Email đã được xác minh");
              this.showToast = true;
              this.router.navigate(['/login']);
            } else {
              console.log("Email chưa được xác minh");
            }
          }
        });
      },
      error: (error) => {
        console.error('Login error:', error);
        this.errorMessage.set(error.message || 'Login failed');
      }
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.registerForm.value;

    this.authService.register(email, password).subscribe({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: (user: any) => {
        console.log('Registration successful:', user);
        this.showToast = true;
        this.authService.onAuthStateChanged().pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: (authUser) => {
            if (authUser) {
              this.checkEmailVerified(email, password);
              if (typeof window !== 'undefined') {
                this.emailVerificationCheckInterval = window.setInterval(() => {
                  this.checkEmailVerified(email, password);
                }, 5000);
              }
            }
          }
        });
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Registration failed:', error);
        this.errorMessage.set(error.message || 'Registration failed. Please try again.');
      }
    });
  }

  // Helper method to mark all form controls as touched
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Getters for form controls
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
  get repassword() { return this.registerForm.get('repassword'); }

  googleSignIn(): void {
    this.isGoogleLoading.set(true);
    this.errorMessage.set('');
    
    this.authService.googleSignIn().subscribe({
      next: () => {
        this.isGoogleLoading.set(false);
        this.router.navigate(['/home']);
      },
      error: (error) => {
        this.isGoogleLoading.set(false);
        console.error('Google sign in error:', error);
        
        switch (error.code) {
          case 'auth/initialization-failed':
            this.errorMessage.set('Failed to initialize authentication. Please refresh the page and try again.');
            break;
          case 'auth/invalid-instance':
            this.errorMessage.set('Authentication service is not ready. Please refresh the page and try again.');
            break;
          case 'auth/popup-closed-by-user':
            this.errorMessage.set('Sign-in popup was closed. Please try again.');
            break;
          case 'auth/popup-blocked':
            this.errorMessage.set('Popup was blocked. Please allow popups for this site.');
            break;
          case 'auth/account-exists-with-different-credential':
            this.errorMessage.set('An account already exists with this email. Please sign in with your password.');
            break;
          case 'auth/operation-not-allowed':
            this.errorMessage.set('Google Sign-In is not enabled. Please contact the administrator or enable it in Firebase Console under Authentication > Sign-in method.');
            break;
          case 'auth/unauthorized-domain':
            this.errorMessage.set('This domain is not authorized for Google Sign-In. Please contact the administrator.');
            break;
          case 'auth/network-request-failed':
            this.errorMessage.set('Network error. Please check your internet connection and try again.');
            break;
          default:
            this.errorMessage.set(error.message || 'An error occurred during Google sign in. Please try again.');
        }
      }
    });
  }
}

