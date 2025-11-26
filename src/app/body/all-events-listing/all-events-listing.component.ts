import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { EventsService } from '../../core/services/events.service';
import { CommonModule } from '@angular/common';
import { EventList } from '../../core/models/eventstype';
import { Observable, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { SafeUrl } from '@angular/platform-browser';
import { SafeUrlService } from '../../core/services/santizer.service';
@Component({
  selector: 'app-all-events-listing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './all-events-listing.component.html',
  styleUrls: ['./all-events-listing.component.css']
})
export class AllEventsListingComponent implements OnInit, OnDestroy {
  private eventsService = inject(EventsService);
  private router = inject(Router);
  private sanitizer = inject(SafeUrlService);

  events$: Observable<EventList[]>;
  displayedEvents: EventList[] = [];
  isLoading = true;
  private subscription: Subscription = new Subscription();

  constructor() {
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

    getSafeUrl(url: string | undefined): SafeUrl| undefined{
      
      return this.sanitizer.sanitizeImageUrl(url);
  
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