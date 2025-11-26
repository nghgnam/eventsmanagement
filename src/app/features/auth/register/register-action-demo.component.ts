import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { getAuth } from 'firebase/auth';
import { AuthService } from '../../../core/services/auth.service';

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

  auth = getAuth();
  currentuserverify = this.auth.currentUser;
  registerForm: FormGroup;
  showPassword: boolean = false;
  showToast: boolean = false;
    /* eslint-disable @typescript-eslint/no-explicit-any */

  private emailVerificationCheckInterval:any;
  errorMessage: string = '';
  isLoading = signal<boolean>(false);
  PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  isPasswordMatch = signal<boolean>(false);

  constructor() {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.pattern(this.PASSWORD_PATTERN)]],
      repassword: ['', [Validators.required, Validators.pattern(this.PASSWORD_PATTERN)]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.auth.onAuthStateChanged(user => {
      if (user) {
        this.router.navigate(['/body']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.emailVerificationCheckInterval) {
      clearInterval(this.emailVerificationCheckInterval);
    }
  }

  passwordMatchValidator(g: FormGroup) {
    this.isPasswordMatch.set(g.get('password')?.value === g.get('repassword')?.value);
    return g.get('password')?.value === g.get('repassword')?.value
      ? this.isPasswordMatch.set(true)
      : this.isPasswordMatch.set(false);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  checkEmailVerified(email: string, password: string): void {
    this.authService.login(email, password).subscribe({
      next: () => {
        const user = this.auth.currentUser;
        if (user?.emailVerified) {
          console.log("Email đã được xác minh");
          this.showToast = true;
          this.router.navigate(['/login']);
        } else {
          console.log("Email chưa được xác minh");
        }
      },
      error: (error) => {
        console.error('Login error:', error);
        this.errorMessage = error.message;
      }
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage = '';

    const { email, password } = this.registerForm.value;

    this.authService.register(email, password).subscribe({
      next: (user) => {
        console.log('Registration successful:', user);
        this.isLoading.set(false);
        this.showToast = true;
        this.auth.onAuthStateChanged(user => {
          if (user) {
            this.checkEmailVerified(email, password);
            this.emailVerificationCheckInterval = setInterval(() => {
              this.checkEmailVerified(email, password);
            }, 5000);
          }
        });
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Registration failed:', error);
        this.errorMessage = error.message;
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

  loginWithGoogle(): void {
    this.authService.googleSignIn().subscribe({
      next: () => {
        this.router.navigate(['/body']);
      },
      error: (error) => {
        console.error('Google sign in error:', error);
      }
    });
  }

  // Getters for form controls
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
  get repassword() { return this.registerForm.get('repassword'); }
}

