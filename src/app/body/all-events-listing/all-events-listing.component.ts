import { Component, OnInit, OnDestroy } from '@angular/core';
import { EventsService } from '../../service/events.service';
import { NgFor, NgIf, CommonModule } from '@angular/common';
import { EventList } from '../../types/eventstype';
import { Observable, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-all-events-listing',
  standalone: true,
  imports: [NgFor, NgIf, CommonModule, RouterModule],
  templateUrl: './all-events-listing.component.html',
  styleUrls: ['./all-events-listing.component.css']
})
export class AllEventsListingComponent implements OnInit, OnDestroy {
  events$: Observable<EventList[]>;
  displayedEvents: EventList[] = [];
  isLoading = true;
  private subscription: Subscription = new Subscription();

  constructor(private eventsService: EventsService, private router: Router) {
    this.events$ = this.eventsService.events$;
  }

  ngOnInit() {
    this.eventsService.fetchEvents();
    const sub = this.events$.subscribe(events => {
      this.isLoading = false;
      this.displayedEvents = events;
    });
    this.subscription.add(sub);
  }

  goToDetail(eventId: string | undefined) {
    if (eventId) {
      this.router.navigate(['/detail', eventId]);
      console.log('Navigating to event detail:', eventId);
    } else {
      console.error("Event ID is undefined!");
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
} 