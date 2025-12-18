import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, inject, model, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
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
  
  checkingForLogin: boolean = false; // kept for backwards compatibility
  isLoggedIn: boolean = false;
  users: User[] = [];
  mobileMenuOpen = false;
  isMobile = false;
  private subscriptions: Subscription[] = [];

  // Notifications UI state (dummy data for now)
  isNotificationsOpen = false;
  unreadCount = 3;
  notifications = [
    {
      id: '1',
      type: 'reminder',
      title: 'Sự kiện sắp diễn ra',
      message: 'Blood Donation Day 2025 sẽ diễn ra sau 24 giờ. Đừng quên chuẩn bị!',
      time: '24h trước'
    },
    {
      id: '2',
      type: 'organizer',
      title: 'Organizer bạn theo dõi vừa tạo sự kiện mới',
      message: 'Red Cross VN vừa mở đăng ký sự kiện “Hiến máu nhân đạo tháng 5”.',
      time: '2h trước'
    },
    {
      id: '3',
      type: 'change',
      title: 'Cập nhật địa điểm sự kiện',
      message: 'Sự kiện Charity Music Night đã đổi sang Nhà hát Lớn Hà Nội.',
      time: 'Hôm qua'
    }
  ];

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
      this.isLoggedIn = !!user;
      
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
        this.isLoggedIn = false;
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Error signing out:', error);
      }
    });
  }

  sanitizeImageUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    return this.sanitizer.sanitizeImageUrl(url);
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  toggleNotifications() {
    this.isNotificationsOpen = !this.isNotificationsOpen;
    if (this.isNotificationsOpen) {
      this.unreadCount = 0;
    }
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
    console.log('openPopup' , this.isHelpOpen());

  }

}