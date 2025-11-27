import { Component } from '@angular/core';
import { HeaderNavbarComponent } from '../shared/components/header/header-navbar/header-navbar.component';
import { FooterPageComponent } from '../shared/components/footer/footer-page/footer-page.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [HeaderNavbarComponent, FooterPageComponent, RouterOutlet],
  template: `
    <app-header-navbar></app-header-navbar>
    <main>
      <router-outlet></router-outlet>
    </main>
    <app-footer-page></app-footer-page>
  `,
  styles: [`
    main {
      min-height: calc(100vh - 200px);
      padding: 20px;
    }
  `]
})
export class LayoutComponent { } 