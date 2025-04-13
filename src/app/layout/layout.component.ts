import { Component } from '@angular/core';
import { HeaderPageComponent } from '../header/header-page/header-page.component';
import { FooterPageComponent } from '../footer-page/footer-page.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [HeaderPageComponent, FooterPageComponent, RouterOutlet],
  template: `
    <app-header-page></app-header-page>
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