import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SharedService } from '../../service/shared.service';
import { auth } from '../../config/firebase.config';
import { getAuth, signOut } from 'firebase/auth';
import { AuthService } from '../../service/auth.service';
import { UsersService } from '../../service/users.service';
import { Observable, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { User } from '../../types/userstype';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { SafeUrlService } from '../../service/santizer.service';
import { HeaderSearchComponent } from '../header-search/header-search.component';

@Component({
  selector: 'app-header-navbar',
  standalone: true,
  imports: [RouterModule, CommonModule, HeaderSearchComponent],
  templateUrl: './header-navbar.component.html',
  styleUrls: ['./header-navbar.component.css']
})
export class HeaderNavbarComponent implements OnInit, OnDestroy {
  user: User | undefined;
  user$: Observable<User[]> | undefined;
  userCurrentId: string | undefined;
  userCurrentname: string | undefined;
  userCurrentImage: string | undefined;
  userCurrentEmail: string | undefined;
  isDropdownOpen: boolean = false;
  auth = getAuth();
  currentUserType: string | undefined;
  
  checkingForLogin: boolean = false;
  users: User[] = [];
  mobileMenuOpen = false;
  isMobile = false;
  private subscriptions: Subscription[] = [];
  private authStateSubscription: any;

  constructor(
    private sharedService: SharedService, 
    private authService: AuthService, 
    private router: Router, 
    private usersService: UsersService, 
    private sanitizer: SafeUrlService
  ) {
    this.user$ = this.usersService.users$;
  }

  ngOnInit(): void {
    // Listen for auth state changes
    this.authStateSubscription = this.auth.onAuthStateChanged(user => {
      this.checkingForLogin = !!user;
      
      // Clear user data if logged out
      if (!user) {
        this.clearUserData();
        return;
      }
      
      // Load user data if logged in
      if (user) {
        const currentUserId = user.uid;
        this.userCurrentId = user.uid;
        const userSub = this.usersService.getCurrentUserById(currentUserId).subscribe(userData => {
          this.userCurrentname = userData?.fullName;
          this.userCurrentImage = userData?.profileImage || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1744575077/default-avatar_br3ffh.png';
          this.userCurrentEmail = userData?.email;
          this.currentUserType = userData?.type;
        });
        this.subscriptions.push(userSub);
      }
    });
    
    const usersSub = this.usersService.users$.subscribe(users => {
      this.users = users;
    });
    this.subscriptions.push(usersSub);
    
    this.onResize();
    window.addEventListener('resize', this.onResize.bind(this));
  }

  ngOnDestroy() {
    // Cleanup all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Remove event listener
    window.removeEventListener('resize', this.onResize.bind(this));
    
    // Remove auth state listener
    if (this.authStateSubscription) {
      this.authStateSubscription();
    }
  }

  // Clear user data when logged out
  clearUserData(): void {
    this.userCurrentId = undefined;
    this.userCurrentname = undefined;
    this.userCurrentImage = undefined;
    this.userCurrentEmail = undefined;
    this.currentUserType = undefined;
    this.isDropdownOpen = false;
  }

  showDropdown(open: boolean): void {
    this.isDropdownOpen = open;
  }

  onNavigate(): void {
    this.sharedService.hideBodyPage();
  }

  goToAccountSetting(): void {
    this.router.navigate(['/account']);
    this.showDropdown(false);
  }

  goToManageEvent(): void {
    this.router.navigate(['/manage-events']);
    this.showDropdown(false);
  }

  goToTicketsManage(): void {
    this.router.navigate(['/tickets-manage']);
    this.showDropdown(false);
  }

  goToFollowing(): void {
    this.router.navigate(['/following']);
    this.showDropdown(false);
  }

  onSignOut(): void {
    signOut(this.auth).then(() => {
      // Clear user data immediately
      this.clearUserData();
      this.checkingForLogin = false;
      this.router.navigate(['/login']);
    }).catch((error) => {
      console.error('Error signing out:', error);
    });
  }

  sanitizeImageUrl(url: string | undefined): SafeUrl | undefined {
    if (!url) return undefined;
    return this.sanitizer.sanitizeImageUrl(url);
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  onResize() {
    this.isMobile = window.innerWidth <= 768;
    if (!this.isMobile) {
      this.mobileMenuOpen = false;
    }
  }
}