import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { EventsService } from '../../service/events.service';
import { NgFor, NgIf, CommonModule } from '@angular/common';
import { EventList } from '../../types/eventstype';
import { map, Observable, Subscription } from 'rxjs';
import { Router } from '@angular/router'; 
import { RouterModule } from '@angular/router';
import { SafeUrlService } from '../../service/santizer.service';
import { SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-body-events-data-listing',
  standalone: true,
  imports: [NgFor, NgIf, CommonModule, RouterModule],
  templateUrl: './body-events-data-listing.component.html',
  styleUrls: ['./body-events-data-listing.component.css']
})
export class BodyEventsDataListingComponent implements OnInit, OnDestroy, OnChanges { 
  @Input() selectedFilter: string = '';
  @Input() location: string = '';
  
  events$: Observable<EventList[]>;
  showAll: boolean = false;
  private filteredEvents: EventList[] = [];
  displayedEvents: EventList[] = [];
  isLoading = true;
  private subscription: Subscription = new Subscription();

  constructor(private eventsService: EventsService, private router: Router, private sanitizer: SafeUrlService) {
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
    const endDate = new Date(event.date_time_options[0].end_time);
    return endDate < now;
  }

  private getFilteredEvents(events: EventList[]): EventList[] {
    let filtered = events.filter(event => !this.isEventExpired(event));

    if (this.selectedFilter) {
      switch (this.selectedFilter) {
        case 'today':
          const today = new Date();
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.date_time_options[0].start_time);
            return eventDate.toDateString() === today.toDateString();
          });
          break;
        case 'weekend':
          const now = new Date();
          const weekendStart = new Date(now);
          weekendStart.setDate(now.getDate() + (6 - now.getDay()));
          weekendStart.setHours(0, 0, 0, 0);
          const weekendEnd = new Date(weekendStart);
          weekendEnd.setDate(weekendStart.getDate() + 2);
          weekendEnd.setHours(23, 59, 59, 999);
          
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.date_time_options[0].start_time);
            return eventDate >= weekendStart && eventDate <= weekendEnd;
          });
          break;
        case 'free':
          filtered = filtered.filter(event => !event.price || event.price === 0);
          break;
        case 'online':
          filtered = filtered.filter(event => event.event_type === 'online');
          break;
      }
    }

    if (this.location) {
      filtered = filtered.filter(event => 
        event.location.address?.toLowerCase().includes(this.location.toLowerCase())
      );
    }

    return filtered;
  }

  getSafeUrl(url: string | undefined): SafeUrl | undefined {
    return this.sanitizer.sanitizeImageUrl(url);
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
      error: (error: any) => console.error('Error updating like status:', error)
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
