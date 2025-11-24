// home-page.component.ts
import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { BodyPageComponent } from '../body/body-page/body-page.component';
import { SharedService } from '../service/shared.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FooterPageComponent } from '../footer-page/footer-page.component';
import { HeaderNavbarComponent } from '../header/header-navbar/header-navbar.component';
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterModule, BodyPageComponent, CommonModule, FooterPageComponent, HeaderNavbarComponent],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent implements OnInit {
  showBodyPage: boolean = true;
  isDetailPage: boolean = false;
  
  private subscription: Subscription;

  constructor(private sharedService: SharedService, private router: Router) {
    this.subscription = this.sharedService.showBodyPage$.subscribe(
      (value) => {
        this.showBodyPage = value;
      }
    );

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isDetailPage = event.url.includes('/detail/');
      }
    });
  }

  


  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}