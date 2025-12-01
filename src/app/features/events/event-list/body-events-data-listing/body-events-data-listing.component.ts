import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, inject } from '@angular/core';
import { EventsService } from '../../../../core/services/events.service';
import { CommonModule } from '@angular/common';
import { EventList } from '../../../../core/models/eventstype';
import { map, Observable, Subscription } from 'rxjs';
import { Router } from '@angular/router'; 
import { RouterModule } from '@angular/router';
import { SafeUrlService } from '../../../../core/services/santizer.service';
import { ImageErrorHandlerDirective } from '../../../../shared/directives/image-error-handler.directive';

@Component({
  selector: 'app-body-events-data-listing',
  standalone: true,
  imports: [CommonModule, RouterModule, ImageErrorHandlerDirective],
  templateUrl: './body-events-data-listing.component.html',
  styleUrls: ['./body-events-data-listing.component.css']
})
export class BodyEventsDataListingComponent implements OnInit, OnDestroy, OnChanges {
  private eventsService = inject(EventsService);
  private router = inject(Router);
  private sanitizer = inject(SafeUrlService);
 
  @Input() selectedFilter: string = '';
  @Input() location: string = '';
  
  events$: Observable<EventList[]>;
  showAll: boolean = false;
  private filteredEvents: EventList[] = [];
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
      this.filteredEvents = this.getFilteredEvents(events);
      this.displayedEvents = this.showAll ? this.filteredEvents : this.filteredEvents.slice(0, 8);
    });
    this.subscription.add(sub);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedFilter'] || changes['location']) {
      this.events$.subscribe(events => {
        this.filteredEvents = this.getFilteredEvents(events);
        this.displayedEvents = this.showAll ? this.filteredEvents : this.filteredEvents.slice(0, 8);
      });
    }
  }

  private isEventExpired(event: EventList): boolean {
    const now = new Date();
    const endDate = this.getDateValue(event.date_time_options?.[0]?.end_time);
    if (!endDate) {
      return false;
    }
    return endDate < now;
  }

  private getFilteredEvents(events: EventList[]): EventList[] {
    let filtered = events.filter(event => !this.isEventExpired(event));

    if (this.selectedFilter) {
      switch (this.selectedFilter) {
        case 'today': {
          const today = new Date();
          filtered = filtered.filter(event => {
            const eventDate = this.getDateValue(event.date_time_options?.[0]?.start_time);
            return eventDate ? eventDate.toDateString() === today.toDateString() : false;
          });
          break;
        }
        case 'weekend': {
          const now = new Date();
          const weekendStart = new Date(now);
          weekendStart.setDate(now.getDate() + (6 - now.getDay()));
          weekendStart.setHours(0, 0, 0, 0);
          const weekendEnd = new Date(weekendStart);
          weekendEnd.setDate(weekendStart.getDate() + 2);
          weekendEnd.setHours(23, 59, 59, 999);
          
          filtered = filtered.filter(event => {
            const eventDate = this.getDateValue(event.date_time_options?.[0]?.start_time);
            return eventDate ? eventDate >= weekendStart && eventDate <= weekendEnd : false;
          });
          break;
        }
        case 'free': {
          filtered = filtered.filter(event => !event.price || event.price === 0);
          break;
        }
        case 'online': {
          filtered = filtered.filter(event => event.event_type === 'online');
          break;
        }
      }
    }

    if (this.location) {
      filtered = filtered.filter(event => 
        event.location.address?.toLowerCase().includes(this.location.toLowerCase())
      );
    }

    return filtered;
  }

  getSafeUrl(url: string | null | undefined, isAvatar: boolean = false): string {
    return this.sanitizer.getSafeUrl(url, isAvatar);
  }

  getDateValue(value: unknown): Date | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'string') {
      const candidate = new Date(value);
      return Number.isNaN(candidate.getTime()) ? null : candidate;
    }
    const possibleTimestamp = value as { toDate?: () => Date; seconds?: number; nanoseconds?: number };
    if (typeof possibleTimestamp?.toDate === 'function') {
      try {
        return possibleTimestamp.toDate();
      // eslint-disable-next-line no-empty
      } catch {}
    }
    if (typeof possibleTimestamp?.seconds === 'number') {
      return new Date(
        possibleTimestamp.seconds * 1000 +
        (typeof possibleTimestamp.nanoseconds === 'number' ? possibleTimestamp.nanoseconds / 1_000_000 : 0)
      );
    }
    return null;
  }

  goToDetail(eventId: string | undefined) {
    if (eventId) {
      this.router.navigate(['/detail', eventId]);
    }
  }

  showMore() {
    this.showAll = true;
    this.events$.subscribe(events => {
      this.filteredEvents = this.getFilteredEvents(events);
      this.displayedEvents = this.filteredEvents;
    });
  }

  toggleLike(event: EventList) {
    if (!event.id) {
      console.error('Event ID is undefined');
      return;
    }

    event.isLiked = !event.isLiked;
    event.likes_count = (event.likes_count || 0) + (event.isLiked ? 1 : -1);

    this.eventsService.updateeventLikes(event.id, event.isLiked).subscribe({
      next: () => console.log('Like status updated successfully!'),
      error: (error) => console.error('Error updating like status:', error)
    });
  }

  get showSeeMore(): Observable<boolean> {
    return this.events$.pipe(
      map(events => this.getFilteredEvents(events).length > 8 && !this.showAll)
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
