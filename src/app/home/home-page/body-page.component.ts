import { Component } from '@angular/core';
import { BodyEventsListingComponent } from '../../features/events/event-list/body-events-listing.component';
import { BodySlideshowComponent } from '../../features/events/slideshow/body-slideshow.component';
@Component({
  selector: 'app-body-page',
  standalone: true,
  imports: [BodySlideshowComponent,BodyEventsListingComponent],
  templateUrl: './body-page.component.html',
  styleUrls: ['./body-page.component.css']
})
export class BodyPageComponent {
}
