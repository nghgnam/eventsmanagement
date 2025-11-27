/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { BodyPageComponent } from '../features/events/home/body-page/body-page.component';
import { SharedService } from '../core/services/shared.service';
import { HeaderNavbarComponent } from '../shared/components/header/header-navbar/header-navbar.component';
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterModule, BodyPageComponent, CommonModule, HeaderNavbarComponent],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent implements  OnDestroy {
  private sharedService = inject(SharedService);
  private router = inject(Router);

  showBodyPage: boolean = true;
  isDetailPage: boolean = false;

  private subscription: Subscription = new Subscription();

  constructor() {
    // Subscribe to shared service - safe for SSR
    this.subscription.add(
      this.sharedService.showBodyPage$.subscribe(
        (value) => {
          this.showBodyPage = value;
        }
      )
    );

    // Subscribe to router events - safe for SSR
    this.subscription.add(
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.isDetailPage = event.url.includes('/detail/');
        }
      })
    );
  }

  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}