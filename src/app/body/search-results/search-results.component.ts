import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventsService } from '../../service/events.service';
import { EventList } from '../../types/eventstype';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.css']
})
export class SearchResultsComponent implements OnInit {
  @Input() searchQuery: string = '';
  @Input() searchType: 'tags' | 'name' | 'organizer' | 'address' = 'name';
  
  events: EventList[] = [];
  filteredEvents: EventList[] = [];
  isLoading: boolean = false;
  error: string | null = null;

  constructor(private eventsService: EventsService) {}

  ngOnInit() {
    this.loadEvents();
  }

  ngOnChanges() {
    if (this.searchQuery) {
      this.filterEvents();
    }
  }

  private loadEvents() {
    this.isLoading = true;
    this.eventsService.fetchEvents();
    this.eventsService.events$.subscribe({
      next: (events: EventList[]) => {
        this.events = events;
        this.filterEvents();
        this.isLoading = false;
      },
      error: (err: Error) => {
        this.error = 'Failed to load events. Please try again later.';
        this.isLoading = false;
        console.error('Error loading events:', err);
      }
    });
  }

  private filterEvents() {
    if (!this.searchQuery) {
      this.filteredEvents = this.events;
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredEvents = this.events.filter(event => {
      switch (this.searchType) {
        case 'tags':
          return event.tags?.some((tag: string) => 
            tag.toLowerCase().includes(query)
          );
        case 'name':
          return event.name.toLowerCase().includes(query);
        case 'organizer':
          return event.organizer.name.toLowerCase().includes(query);
        case 'address':
          return event.location?.address?.toLowerCase().includes(query) ?? false;
        default:
          return false;
      }
    });
  }

  goToDetail(eventId: string) {
    // Navigate to event detail page
    window.location.href = `/detail-event/${eventId}`;
  }
} 