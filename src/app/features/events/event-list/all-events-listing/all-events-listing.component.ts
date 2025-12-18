import { Component, inject, computed, effect } from '@angular/core';
import { EventsService } from '../../../../core/services/events.service';
import { CommonModule } from '@angular/common';
import { EventList } from '../../../../core/models/eventstype';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { SafeUrlService } from '../../../../core/services/santizer.service';
import { ScrollingModule } from '@angular/cdk/scrolling';
@Component({
  selector: 'app-all-events-listing',
  standalone: true,
  imports: [CommonModule, RouterModule, ScrollingModule],
  templateUrl: './all-events-listing.component.html',
  styleUrls: ['./all-events-listing.component.css']
})
export class AllEventsListingComponent {
  private eventsService = inject(EventsService);
  private router = inject(Router);
  private sanitizer = inject(SafeUrlService);

  // Reactive view-model
  readonly state = this.eventsService.eventsResource;
  readonly isLoading = computed(() => this.state().isLoading);
  readonly events = computed<EventList[]>(() => {
    const data = this.state().data as unknown;
    // Backend response structure: { success, message, data: { data: Event[], pagination } }
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object') {
      const inner = (data as { data?: unknown }).data;
      if (Array.isArray(inner)) return inner as EventList[];
      if (inner && typeof inner === 'object') {
        const nested = (inner as { data?: unknown }).data;
        if (Array.isArray(nested)) return nested as EventList[];
      }
    }
    return [];
  });

  // Debug logging for incoming data/state
  readonly debugState = effect(() => {
    const state = this.state();
    const total = this.events().length;
    console.debug('[AllEventsListing] state', {
      isLoading: state.isLoading,
      error: state.error,
      total,
    });
  });

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
      } catch { }
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
} 
