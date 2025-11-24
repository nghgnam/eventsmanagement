import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BodySlideshowComponent } from '../body-slideshow/body-slideshow.component';
import { BodyEventsListingComponent } from '../body-events-listing/body-events-listing.component';
@Component({
  selector: 'app-body-page',
  standalone: true,
  imports: [BodySlideshowComponent,BodyEventsListingComponent],
  templateUrl: './body-page.component.html',
  styleUrls: ['./body-page.component.css']
})
export class BodyPageComponent {
}
