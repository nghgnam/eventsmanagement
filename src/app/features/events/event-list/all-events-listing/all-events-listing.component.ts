import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { EventsService } from '../../../../core/services/events.service';
import { CommonModule } from '@angular/common';
import { EventList } from '../../../../core/models/eventstype';
import { Observable, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { SafeUrlService } from '../../../../core/services/santizer.service';
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

    getSafeUrl(url: string | null | undefined): string | undefined {
      return this.sanitizer.getSafeUrl(url ?? undefined, false);
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
      console.log('Navigating to event detail:', eventId);
    } else {
      console.error("Event ID is undefined!");
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
} 
