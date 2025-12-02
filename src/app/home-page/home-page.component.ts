/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, inject, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { BodyPageComponent } from '../features/events/home/body-page/body-page.component';
import { SharedService } from '../core/services/shared.service';
import { HeaderNavbarComponent } from '../shared/components/header/header-navbar/header-navbar.component';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterModule, BodyPageComponent, CommonModule, HeaderNavbarComponent],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent implements OnDestroy {
  private sharedService = inject(SharedService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  showBodyPage = signal(true);
  isDetailPage = signal(false);
  isAuthenticated = signal(false);

  private subscription: Subscription = new Subscription();

  constructor() {
    // Subscribe to shared service - safe for SSR
    this.subscription.add(
      this.sharedService.showBodyPage$.subscribe(
        (value) => {
          this.showBodyPage.set(value);
        }
      )
    );

    // Subscribe to router events - safe for SSR
    this.subscription.add(
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.isDetailPage.set(event.url.includes('/detail/'));
        }
      })
    );

    // Check authentication state - only on browser
    if (isPlatformBrowser(this.platformId  as object)) {
      this.authService.onAuthStateChanged()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (user) => {
            this.isAuthenticated.set(!!user);
            // Show body page if authenticated, or if shared service allows
            if (user) {
              this.showBodyPage.set(true);
            }
          },
          error: (error) => {
            console.error('[HomePageComponent] Auth state error:', error);
            this.isAuthenticated.set(false);
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}