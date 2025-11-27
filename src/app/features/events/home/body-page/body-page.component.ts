import { Component } from '@angular/core';
import { BodyEventsListingComponent } from '../../event-list/body-events-listing/body-events-listing.component';
import { BodySlideshowComponent } from '../../slideshow/body-slideshow/body-slideshow.component';
@Component({
  selector: 'app-body-page',
  standalone: true,
  imports: [BodySlideshowComponent,BodyEventsListingComponent],
  templateUrl: './body-page.component.html',
  styleUrls: ['./body-page.component.css']
})
export class BodyPageComponent {
}
