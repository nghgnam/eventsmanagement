import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderPageComponent } from '../header/header-page/header-page.component';
import { FooterPageComponent } from '../footer-page/footer-page.component';

@Component({
  selector: 'app-layout-router',
  standalone: true,
  imports: [RouterOutlet, HeaderPageComponent, FooterPageComponent],
  templateUrl: './layout-router.component.html',
  styleUrls: ['./layout-router.component.css']
})
export class LayoutRouterComponent {
  // Component logic here
}
