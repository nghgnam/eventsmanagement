import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { getAuth, Unsubscribe } from 'firebase/auth';
import { AuthService } from '../../../core/services/auth.service';
import { EventsService } from '../../../core/services/events.service';
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
export class LoginActionDemoComponent implements OnInit, OnDestroy{
  private eventsService = inject(EventsService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  email: string | null = null;
  password: string = ''; 

  userForm: FormGroup;
  showPassword: boolean = false; 
  auth = getAuth();
  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);
  private unsubscribeFn: Unsubscribe | undefined;

  constructor(){
    this.userForm = this.fb.group({
      email: ['' , [Validators.required , Validators.email]],
      password: ['' , [Validators.required]]
    })
  }
  ngOnInit(): void {
    this.unsubscribeFn = this.auth.onAuthStateChanged((hasLogin)=>{
      if(hasLogin && this.router.url !=='/body') this.router.navigate(['/body'])
    })
  }
  ngOnDestroy(): void{
    if(this.unsubscribeFn){
      this.unsubscribeFn()
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    if(this.userForm.invalid){
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
  get emailCtrl() { return this.userForm.get('email')!; }
  get passwordCtrl() { return this.userForm.get('password')!; }

}
