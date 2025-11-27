import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, PLATFORM_ID, DestroyRef, model } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { SafeUrlService } from '../../../../core/services/santizer.service';
import { SharedService } from '../../../../core/services/shared.service';
import { UsersService } from '../../../../core/services/users.service';
import { User } from '../../../../core/models/userstype';
import { HeaderSearchComponent } from '../header-search/header-search.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PopupComponent } from '../../../components/popup/popup.component';

@Component({
  selector: 'app-header-navbar',
  standalone: true,
  imports: [RouterModule, CommonModule, HeaderSearchComponent, PopupComponent],
  templateUrl: './header-navbar.component.html',
  styleUrls: ['./header-navbar.component.css']
})
export class HeaderNavbarComponent implements OnInit, OnDestroy {
  private sharedService = inject(SharedService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private usersService = inject(UsersService);
  private sanitizer = inject(SafeUrlService);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  user: User | undefined;
  user$: Observable<User[]> | undefined;
  userCurrentId: string | undefined;
  userCurrentname: string | undefined;
  userCurrentImage: string | undefined;
  userCurrentEmail: string | undefined;
  isDropdownOpen: boolean = false;
  currentUserType: string | null | undefined;
  
  checkingForLogin: boolean = false;
  users: User[] = [];
  mobileMenuOpen = false;
  isMobile = false;
  private subscriptions: Subscription[] = [];

  constructor() {
    this.user$ = this.usersService.users$;
  }

  ngOnInit(): void {
    // Only listen for auth state changes on browser, not during SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    // Use AuthService.onAuthStateChanged() instead of direct Firebase call
    this.authService.onAuthStateChanged().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(user => {
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
    
    // Only run browser-specific code on client-side
    if (isPlatformBrowser(this.platformId)) {
      this.onResize();
      window.addEventListener('resize', this.onResize.bind(this));
    }
  }

  ngOnDestroy() {
    // Cleanup all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Remove event listener (only on browser)
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.onResize.bind(this));
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
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.authService.logout().subscribe({
      next: () => {
        // Clear user data immediately
        this.clearUserData();
        this.checkingForLogin = false;
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Error signing out:', error);
      }
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
    // Only access window on browser platform
    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      this.isMobile = window.innerWidth <= 768;
      if (!this.isMobile) {
        this.mobileMenuOpen = false;
      }
    }
  }
  isHelpOpen = model<boolean>(false);
  openPopup(){
    this.isHelpOpen.set(true);
  }

}