import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterPageComponent } from '../shared/components/footer/footer-page/footer-page.component';
import { HeaderNavbarComponent } from '../shared/components/header/header-navbar/header-navbar.component';

@Component({
  selector: 'app-layout-router',
  standalone: true,
  imports: [RouterOutlet, FooterPageComponent, HeaderNavbarComponent],
  templateUrl: './layout-router.component.html',
  styleUrls: ['./layout-router.component.css']
})
export class LayoutRouterComponent {
  // Component logic here
}
