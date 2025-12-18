import { Component, computed, signal, inject, effect, PLATFORM_ID, DestroyRef } from '@angular/core';
import { EventsService } from '../../../../core/services/events.service';
import { CommonModule } from '@angular/common';
import { EventList } from '../../../../core/models/eventstype';
import { Router, RouterModule } from '@angular/router';
import { SafeUrlService } from '../../../../core/services/santizer.service';
import { ImageErrorHandlerDirective } from '../../../../shared/directives/image-error-handler.directive';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
@Component({
  selector: 'app-body-events-data-listing',
  standalone: true,
  imports: [CommonModule, RouterModule, ImageErrorHandlerDirective, MatPaginatorModule],
  templateUrl: './body-events-data-listing.component.html',
  styleUrls: ['./body-events-data-listing.component.css']
})
export class BodyEventsDataListingComponent {
  private eventsService = inject(EventsService);
  private router = inject(Router);
  private sanitizer = inject(SafeUrlService);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  readonly showAll = signal(false);
  private readonly optimisticLikes = signal<Record<string, { isLiked: boolean; likes: number }>>({});

  readonly state = this.eventsService.eventsResource;
  readonly isLoading = computed(() => this.state().isLoading);
  readonly events = computed<EventList[]>(() => {
    const data = this.state().data as unknown as { data?: { data?: EventList[] }; pagination?: { total?: number } };
    const list = data?.data?.data ?? data?.data ?? [];
    return Array.isArray(list) ? list : [];
  });

  // Lấy pagination info từ response
  readonly pagination = computed(() => {
    const data = this.state().data as unknown as { data?: { pagination?: { total?: number } }; pagination?: { total?: number } };
    return data?.data?.pagination ?? data?.pagination ?? null;
  });

  readonly totalCount = computed(() => {
    const pagination = this.pagination();
    return pagination?.total ?? this.events().length;
  });

  readonly currentPageIndex = computed(() => {
    const filterState = this.eventsService.filterState();
    return (filterState.page ?? 1) - 1;
  });

  readonly currentPageSize = computed(() => {
    const filterState = this.eventsService.filterState();
    return filterState.limit ?? 20;
  });

  // Áp dụng optimistic likes lên list events từ backend
  readonly enhancedEvents = computed<EventList[]>(() => {
    const overrides = this.optimisticLikes();
    const base = this.events().map((e) => {
      if (e.id && overrides[e.id]) {
        const ov = overrides[e.id];
        return { ...e, isLiked: ov.isLiked, likes_count: ov.likes };
      }
      return e;
    });

    return base;
  });

  // Hiển thị tất cả events từ backend (pagination đã được xử lý ở backend)
  readonly displayedEvents = computed<EventList[]>(() => {
    return this.enhancedEvents();
  });

  readonly showSeeMore = computed(() => false); // Disabled vì đã dùng paginator

  readonly debugState = effect(() => {
    const state = this.state();
    const total = this.events().length;
    const enhanced = this.enhancedEvents().length;
    const displayed = this.displayedEvents().length;

    console.log('[BodyEventsDataListing] state', {
      isLoading: state.isLoading,
      error: state.error,
      total,
      enhanced,
      displayed,
      sampleEvent: this.events()[0],
      displayedEvents: this.displayedEvents()
    });

    if (!state.isLoading && total > 0) {
      console.log('[BodyEventsDataListing] events', this.events());
      console.log('[BodyEventsDataListing] displayed', this.displayedEvents());
    }

    if (!state.isLoading && total === 0) {
      console.warn('[BodyEventsDataListing] No events after load', { state });
    }
  });

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
    }
  }

  showMore() {
    this.showAll.set(true);
  }

  toggleLike(event: EventList) {
    if (!event.id) {
      console.error('Event ID is undefined');
      return;
    }

    event.isLiked = !event.isLiked;
    event.likes_count = (event.likes_count || 0) + (event.isLiked ? 1 : -1);

    const current = this.optimisticLikes();
    const override = event.id ? current[event.id] : undefined;
    const nowLiked = override?.isLiked ?? event.isLiked ?? false;
    const baseLikes = override?.likes ?? event.likes_count ?? 0;
    const newLiked = !nowLiked;
    const newLikes = baseLikes + (newLiked ? 1 : -1);

    if (event.id) {
      this.optimisticLikes.update((m) => ({ ...m, [event.id!]: { isLiked: newLiked, likes: newLikes } }));
      this.eventsService.updateeventLikes(event.id, newLiked).subscribe({
        next: () => { },
        error: (error) => console.error('Error updating like status:', error)
      });
    }
  }
  onPageChange(event: PageEvent) {
    this.eventsService.updateFilter({
      page: event.pageIndex + 1,
      limit: event.pageSize
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
