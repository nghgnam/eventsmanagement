import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule  , FormGroup, ReactiveFormsModule, FormBuilder, Validators} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { User } from '../types/userstype';
import { EventsService } from '../service/events.service';
import { AuthService } from '../service/auth.service';
import { getAuth } from 'firebase/auth';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ChangeDetectorRef } from '@angular/core';
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
export class LoginActionDemoComponent implements OnInit{
  email: any;
  password: string = ''; 

  userForm: FormGroup;
  showPassword: boolean = false; 
  auth = getAuth();
  errorMessage: string = '';
  isLoading: boolean = false;
  private unsubscribeFn: any;



  constructor(
    private eventsService : EventsService, 
    private authService: AuthService, 
    private router: Router,
    private fb : FormBuilder,
    private cdr: ChangeDetectorRef
  ){
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
    this.isLoading = true;
    this.errorMessage = '';
    if(this.userForm.invalid){
      this.errorMessage = 'Please fill in all required fields correctly';
      return;
    }
    const email = this.userForm.get('email')?.value;
    const password = this.userForm.get('password')?.value;
    this.authService.login(email, password).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/body']);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Login error:', error);
        
        switch (error.code) {
          case 'auth/invalid-credential':
            this.errorMessage = 'Invalid email or password. Please try again.';
            
            break;
          case 'auth/user-not-found':
            this.errorMessage = 'No account found with this email.';
            break;
          case 'auth/wrong-password':
            this.errorMessage = 'Incorrect password.';
            break;
          case 'auth/too-many-requests':
            this.errorMessage = 'Too many failed login attempts. Please try again later.';
            break;
          case 'auth/user-disabled':
            this.errorMessage = 'This account has been disabled.';
            break;
          default:
            this.errorMessage = 'An error occurred during login. Please try again.';
        }
      }
    });  
    
    this.cdr.markForCheck();
  }
get emailCtrl() { return this.userForm.get('email')!; }
get passwordCtrl() { return this.userForm.get('password')!; }

}
