import { Component } from '@angular/core';
import { HeaderBandingComponent } from "../header-banding/header-banding.component";
import { HeaderNavbarComponent } from "../header-navbar/header-navbar.component";
import { HeaderSearchComponent } from '../header-search/header-search.component';
@Component({
  selector: 'app-header-page',
  standalone: true,
  imports: [HeaderBandingComponent, HeaderNavbarComponent, HeaderSearchComponent],
  templateUrl: './header-page.component.html',
  styleUrls: ['./header-page.component.css']
})
export class HeaderPageComponent {

}
