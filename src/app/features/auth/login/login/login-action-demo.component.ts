import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, PLATFORM_ID, signal, DestroyRef } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { EventsService } from '../../../../core/services/events.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
@Component({
  selector: 'app-login-action-demo',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule
  ],
  templateUrl: './login-action-demo.component.html',
  styleUrls: ['./login-action-demo.component.css']
})
export class LoginActionDemoComponent implements OnInit {
  private eventsService = inject(EventsService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  email: string | null = null;
  password: string = '';

  userForm: FormGroup;
  showPassword: boolean = false;
  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  constructor() {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    })
  }
  
  ngOnInit(): void {
    // Only check auth state on browser, not during SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    // Use AuthService's onAuthStateChanged instead of direct getAuth()
    this.authService.onAuthStateChanged().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (user) => {
        if (user && this.router.url !== '/body') {
          this.router.navigate(['/body']);
        }
      },
      error: (error) => {
        console.error('[LoginComponent] Auth state error:', error);
        // Don't block the UI if auth check fails
      }
    });
  }
  
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    if (this.userForm.invalid) {
      this.errorMessage.set('Please fill in all required fields correctly');
      return;
    }
    const email = this.userForm.get('email')?.value;
    const password = this.userForm.get('password')?.value;
    this.authService.login(email, password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/body']);
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Login error:', error);

        switch (error.code) {
          case 'auth/invalid-credential':
            this.errorMessage.set('Invalid email or password. Please try again.');

            break;
          case 'auth/user-not-found':
            this.errorMessage.set('No account found with this email.');
            break;
          case 'auth/wrong-password':
            this.errorMessage.set('Incorrect password.');
            break;
          case 'auth/too-many-requests':
            this.errorMessage.set('Too many failed login attempts. Please try again later.');
            break;
          case 'auth/user-disabled':
            this.errorMessage.set('This account has been disabled.');
            break;
          default:
            this.errorMessage.set('An error occurred during login. Please try again.');
        }
      }
    });

  }
  get emailCtrl() { return this.userForm.get('email')!; }
  get passwordCtrl() { return this.userForm.get('password')!; }

  googleSignIn(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    
    this.authService.googleSignIn().subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/body']);
      },
      error: (error) => {
        this.isLoading.set(false);
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
