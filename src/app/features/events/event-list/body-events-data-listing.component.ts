/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, inject } from '@angular/core';
import { EventsService } from '../../../core/services/events.service';
import { CommonModule } from '@angular/common';
import { EventList, TimestampLike, EventEngagement } from '../../../core/models/eventstype';
import { map, Observable, Subscription } from 'rxjs';
import { Router } from '@angular/router'; 
import { RouterModule } from '@angular/router';
import { SafeUrlService } from '../../../core/services/santizer.service';
import { SafeUrl } from '@angular/platform-browser';
import { Timestamp } from 'firebase/firestore';

@Component({
  selector: 'app-body-events-data-listing',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
    const endDate = this.getEventEndDate(event);
    return endDate ? endDate < now : false;
  }

  private getFilteredEvents(events: EventList[]): EventList[] {
    let filtered = events.filter(event => !this.isEventExpired(event));

    if (this.selectedFilter) {
      switch (this.selectedFilter) {
        case 'today': {

          const today = new Date();
          filtered = filtered.filter(event => {
            const eventDate = this.getEventStartDate(event);
            return eventDate ? new Date(eventDate).toDateString() === new Date(today).toDateString() : false;
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
            const eventDate = this.getEventStartDate(event);
            return eventDate ? (eventDate >= weekendStart && eventDate <= weekendEnd) : false;
          });
          break;
        }
        case 'free': {
          filtered = filtered.filter(event => !this.getEventPrice(event));  
          break;
        }
        case 'online': {
          filtered = filtered.filter(event => (event.location?.type ?? event.core?.eventType) === 'online');
          break;
        }
      }
    }

    if (this.location) {
      filtered = filtered.filter(event => 
        event.location?.address?.toLowerCase().includes(this.location.toLowerCase())
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

    const currentLikes = event.engagement?.likesCount ?? 0;
    event.isLiked = !event.isLiked;
    const change = event.isLiked ? 1 : -1;
    event.engagement = {
      attendeesCount: event.engagement?.attendeesCount ?? 0,
      likesCount: currentLikes + change,
      viewCount: event.engagement?.viewCount ?? 0,
      searchTerms: event.engagement?.searchTerms ?? []
    } as EventEngagement;

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

  getEventImage(event: EventList): string {
    return (
      event.media?.primaryImage ||
      event.media?.coverImage ||
      'assets/images/default-event.jpg'
    );
  }

  getEventStartDate(event: EventList): Date | null {
    const primaryOption = this.getPrimaryDateOption(event);
    const value = primaryOption ? (primaryOption['start_time'] ?? primaryOption['startTime']) : event.schedule?.startDate;
    return this.toDate(value as TimestampLike | string | undefined);
  }

  getEventEndDate(event: EventList): Date | null {
    const primaryOption = this.getPrimaryDateOption(event);
    const value = primaryOption ? (primaryOption['end_time'] ?? primaryOption['endTime']) : event.schedule?.endDate;
    return this.toDate(value as TimestampLike | string | undefined);
  }

  getEventType(event: EventList): string | null {
    return event.core?.eventType ?? event.location?.type ?? null;
  }

  hasTag(event: EventList, tag: string): boolean {
    return (event.core?.tags ?? []).some(t => t?.toLowerCase() === tag.toLowerCase());
  }

  getEventPrice(event: EventList): number | null {
    return event.core?.price ?? null;
  }

  getPriceLabel(event: EventList): string {
    const price = this.getEventPrice(event);
    if (price === null || price === undefined || price === 0) {
      return 'Free';
    }
    const currency = (event.metadata?.['currency'] as string) ?? 'VND';
    return `${price.toLocaleString()} ${currency}`;
  }

  getOrganizerName(event: EventList): string {
    return event.organizer?.name || 'Unknown Organizer';
  }

  getLikesCount(event: EventList): number {
    return event.engagement?.likesCount ?? 0;
  }

  getOrganizerImage(event: EventList): SafeUrl | string {
    const source = event.organizer?.profileImage || event.organizer?.logo || undefined;
    return this.getSafeUrl(source) || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1744575077/default-avatar_br3ffh.png';
  }

  private toDate(value: TimestampLike | string | number | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    if (value?.toDate instanceof Function) {
      return value.toDate();
    }
    if (typeof value === 'object' && typeof (value as { _seconds: number })._seconds === 'number') {
      const seconds = (value as { _seconds: number })._seconds;
      const nanos = (value as { _nanoseconds: number })._nanoseconds ?? 0;
      return new Date(seconds * 1000 + nanos / 1e6);
    }
    return null;
  }
  private getPrimaryDateOption(event: EventList): Record<string, unknown> | null {
    const options = event.schedule?.dateTimeOptions;
    if (options && options.length > 0) {
      return options[0] as Record<string, unknown>;
    }
    return null;
  }
}
