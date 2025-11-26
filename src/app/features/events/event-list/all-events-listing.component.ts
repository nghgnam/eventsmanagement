/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { EventsService } from '../../../core/services/events.service';
import { CommonModule } from '@angular/common';
import { EventList, TimestampLike } from '../../../core/models/eventstype';
import { Observable, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { SafeUrlService } from '../../../core/services/santizer.service';

type ScheduleOption = Record<string, TimestampLike | string | number | null | undefined>;

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

  getEventImage(event: EventList): string {
    return (
      event.media?.primaryImage ||
      event.media?.coverImage ||
      'assets/images/default-event.jpg'
    );
  }

  getEventStartDate(event: EventList): Date | null {
    const option = this.getPrimaryScheduleOption(event);
    const value = option ? option['start_time'] ?? option['startTime'] : event.schedule?.startDate;
    return this.toDate(value);
  }

  getEventType(event: EventList): string | null {
    return event.core?.eventType ?? event.location?.type ?? null;
  }

  getEventTags(event: EventList): string[] {
    return event.core?.tags ?? [];
  }

  getEventPrice(event: EventList): number | null {
    return event.core?.price ?? null;
  }

  getEventPriceLabel(event: EventList): string {
    const price = this.getEventPrice(event);
    if (!price) {
      return 'Free';
    }
    const currency = (event.metadata?.['currency'] as string) ?? 'VND';
    return `${price.toLocaleString()} ${currency}`;
  }

  getEventLocationLabel(event: EventList): string {
    if (event.location?.type === 'online') {
      return 'Online Event';
    }
    return event.location?.address || 'No address provided';
  }

  getOrganizerImage(event: EventList): string {
    return (
      this.sanitizer.sanitizeImageUrl(event.organizer?.profileImage || event.organizer?.logo || '') ||
      'https://res.cloudinary.com/dpiqldk0y/image/upload/v1744575077/default-avatar_br3ffh.png'
    ) as string;
  }

  getOrganizerName(event: EventList): string {
    return event.organizer?.name || 'Unknown Organizer';
  }

  goToDetail(eventId: string | undefined) {
    if (eventId) {
      this.router.navigate(['/detail', eventId]);
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private getPrimaryScheduleOption(event: EventList): ScheduleOption | undefined {
    return (event.schedule?.dateTimeOptions as ScheduleOption[])?.[0];
  }

  private toDate(value: TimestampLike | string | number | Date | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
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
}