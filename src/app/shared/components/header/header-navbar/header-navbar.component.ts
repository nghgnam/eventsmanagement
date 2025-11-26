import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import { Unsubscribe, getAuth, signOut } from 'firebase/auth';
import { Observable, Subscription } from 'rxjs';
import { User } from '../../../../core/models/userstype';
import { AuthService } from '../../../../core/services/auth.service';
import { SafeUrlService } from '../../../../core/services/santizer.service';
import { SharedService } from '../../../../core/services/shared.service';
import { UsersService } from '../../../../core/services/users.service';
import { HeaderSearchComponent } from '../header-search/header-search.component';

@Component({
  selector: 'app-header-navbar',
  standalone: true,
  imports: [RouterModule, CommonModule, HeaderSearchComponent],
  templateUrl: './header-navbar.component.html',
  styleUrls: ['./header-navbar.component.css']
})
export class HeaderNavbarComponent implements OnInit, OnDestroy {
  private sharedService = inject(SharedService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private usersService = inject(UsersService);
  private sanitizer = inject(SafeUrlService);
  private platformId = inject<object>(PLATFORM_ID);

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
  private authStateSubscription: Unsubscribe | undefined;


  ngOnInit(): void {
    this.user$ = this.usersService.users$;

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
          this.userCurrentname = userData?.profile?.fullName || undefined;
          this.userCurrentImage = userData?.profile?.avatar || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1744575077/default-avatar_br3ffh.png';
          this.userCurrentEmail = userData?.account?.email || undefined;
          this.currentUserType = userData?.account?.type || undefined;
        });
        this.subscriptions.push(userSub);
      }
    });
    
    const usersSub = this.usersService.users$.subscribe(users => {
      this.users = users;
    });
    this.subscriptions.push(usersSub);
    
    this.onResize();
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('resize', this.onResize.bind(this));
    }
  }

  ngOnDestroy() {
    // Cleanup all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Remove event listener
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.onResize.bind(this));
    }
    
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
    console.log("goToAccountSetting");
    this.router.navigate(['/account']);
    this.showDropdown(false);
  }

  goToManageEvent(): void {
    console.log("goToManageEvent");
    this.router.navigate(['/manage-events']);
    this.showDropdown(false);
  }

  goToTicketsManage(): void {
    console.log("goToTicketsManage");
    this.router.navigate(['/tickets-manage']);
    this.showDropdown(false);
  }

  goToFollowing(): void {
    console.log("goToFollowing");
    this.router.navigate(['/following']);
    this.showDropdown(false);
  }

  onSignOut(): void {
    console.log("onSignOut");
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
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile = window.innerWidth <= 768;
    }
    if (!this.isMobile) {
      this.mobileMenuOpen = false;
    }
  }
}