import { Component, OnInit, ElementRef, ViewChild, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EventsService } from '../../../../core/services/events.service';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { EventList, TimestampLike } from '../../../../core/models/eventstype';

@Component({
  selector: 'app-header-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './header-search.component.html',
  styleUrls: ['./header-search.component.css']
})
export class HeaderSearchComponent implements OnInit {
  private fb = inject(FormBuilder);
  private eventsService = inject(EventsService);
  private router = inject(Router);

  @ViewChild('searchContainer') searchContainer!: ElementRef;
  
  searchForm!: FormGroup;
  searchResults: EventList[] = [];
  isLoading = false;
  showResults = false;


  ngOnInit() {
    this.searchForm = this.fb.group({
      searchQuery: ['']
    });
    this.searchForm.get('searchQuery')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
          if (!query || query.length < 2) {
            this.showResults = false;
            this.searchResults = [];
            return of([]);
          }
          
          this.isLoading = true;
          this.showResults = true;
          
          return this.eventsService.searchEvents(query).pipe(
            catchError(error => {
              console.error('Search error:', error);
              return of([]);
            })
          );
        })
      )
      .subscribe(results => {
        this.searchResults = results;
        this.isLoading = false;
      });
  }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!this.searchContainer.nativeElement.contains(target)) {
      this.showResults = false;
    }
  }

  onFocus() {
    const query = this.searchForm.get('searchQuery')?.value;
    if (query && query.length >= 2) {
      this.showResults = true;
    }
  }

  onBlur(event: FocusEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (!relatedTarget || !this.searchContainer.nativeElement.contains(relatedTarget)) {
      setTimeout(() => {
        this.showResults = false;
      }, 200);
    }
  }

  onSubmit() {
    const query = this.searchForm.get('searchQuery')?.value;
    if (query) {
      this.router.navigate(['/search-results'], { 
        queryParams: { q: query }
      });
      this.showResults = false;
    }
  }

  onResultClick(event: EventList) {
    if (event.id) {
      this.router.navigate(['/detail', event.id]);
      this.showResults = false;
    }
  }

  getEventImage(event: EventList): string {
    return (
      event.media?.primaryImage ||
      event.media?.coverImage ||
      'assets/images/default-event.jpg'
    );
  }

  getEventName(event: EventList): string {
    return event.core?.name ?? 'Untitled Event';
  }

  getEventStartDate(event: EventList): Date | null {
    const option = this.getPrimaryScheduleOption(event);
    const value = option ? option['start_time'] ?? option['startTime'] : event.schedule?.startDate;
    return this.toDate(value);
  }

  getEventLocationLabel(event: EventList): string {
    if (event.location?.type === 'online') {
      return 'Online Event';
    }
    return event.location?.address || 'No address specified';
  }

  getEventTypeLabel(event: EventList): string {
    return event.core?.eventType ?? 'General';
  }

  getOrganizerName(event: EventList): string {
    return event.organizer?.name ?? 'Unknown organizer';
  }

  private getPrimaryScheduleOption(event: EventList): Record<string, TimestampLike | string | number | null | undefined> | undefined {
    return (event.schedule?.dateTimeOptions as Record<string, TimestampLike | string | number | null | undefined>[])?.[0];
  }

  private toDate(value: TimestampLike | string | number | Date | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    if ((value as { toDate?: () => Date })?.toDate instanceof Function) {
      return (value as { toDate?: () => Date })?.toDate?.() ?? null;
    }
    if (typeof value === 'object' && typeof (value as { _seconds: number })._seconds === 'number') {
      const seconds = (value as { _seconds: number })._seconds;
      const nanos = (value as { _nanoseconds?: number })._nanoseconds ?? 0;
      return new Date(seconds * 1000 + nanos / 1e6);
    }
    return null;
  }
}
