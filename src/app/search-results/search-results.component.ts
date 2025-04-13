import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EventsService } from '../service/events.service';
import { EventList } from '../types/eventstype';
import { Subscription } from 'rxjs';

declare var google: any;

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.css']
})
export class SearchResultsComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  events: EventList[] = [];
  filteredEvents: EventList[] = [];
  searchQuery: string = '';
  isLoading: boolean = true;
  subscription: Subscription = new Subscription();
  availableTags: string[] = [];
  selectedTags: string[] = [];
  selectedLocationType: 'all' | 'online' | 'offline' = 'all';
  selectedDate: 'all' | 'today' | 'tomorrow' | 'week' = 'all';
  map: any;
  markers: any[] = [];
  
  // Properties for filter UI
  showFilters: boolean = false;
  activeFilters: number = 0;
  filters = {
    tags: {} as { [key: string]: boolean },
    date: 'all',
    locationType: 'all'
  };
  
  // Properties for map functionality
  isFullMapOpen: boolean = false;
  showLocationConfirm: boolean = false;
  selectedEvent: EventList | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventsService: EventsService
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.route.queryParams.subscribe(params => {
        this.searchQuery = params['q'] || '';
        this.loadEvents();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.map) {
      // Clean up map instance
      this.map = null;
    }
  }

  private loadEvents(): void {
    this.isLoading = true;
    this.subscription.add(
      this.eventsService.getAllEvents().subscribe({
        next: (events) => {
          this.events = events;
          this.filterEvents();
          this.extractTagsFromEvents();
          this.initializeFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading events:', error);
          this.isLoading = false;
        }
      })
    );
  }

  private extractTagsFromEvents(): void {
    const tagSet = new Set<string>();
    this.events.forEach(event => {
      if (event.tags) {
        event.tags.forEach(tag => tagSet.add(tag));
      }
    });
    this.availableTags = Array.from(tagSet).sort();
  }

  private initializeFilters(): void {
    this.selectedTags = [];
    this.selectedLocationType = 'all';
    this.selectedDate = 'all';
    
    // Initialize tag filters
    this.filters.tags = {};
    this.availableTags.forEach(tag => {
      this.filters.tags[tag] = false;
    });
    
    this.filters.date = 'all';
    this.filters.locationType = 'all';
    
    this.updateActiveFiltersCount();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  updateActiveFiltersCount(): void {
    let count = 0;
    
    // Count selected tags
    Object.values(this.filters.tags).forEach(isSelected => {
      if (isSelected) count++;
    });
    
    // Count date filter if not 'all'
    if (this.filters.date !== 'all') count++;
    
    // Count location type filter if not 'all'
    if (this.filters.locationType !== 'all') count++;
    
    this.activeFilters = count;
  }

  applyFilters(): void {
    // Update selected tags from filters
    this.selectedTags = Object.entries(this.filters.tags)
      .filter(([_, selected]) => selected)
      .map(([tag]) => tag);
    
    // Update selected location type
    this.selectedLocationType = this.filters.locationType as 'all' | 'online' | 'offline';
    
    // Update selected date
    this.selectedDate = this.filters.date as 'all' | 'today' | 'tomorrow' | 'week';
    
    // Apply filters
    this.filterEvents();
    
    // Update active filters count
    this.updateActiveFiltersCount();
  }

  resetFilters(): void {
    this.initializeFilters();
    this.applyFilters();
  }

  getTagIcon(tag: string): string {
    const iconMap: { [key: string]: string } = {
      'blood': 'bloodtype',
      'medical': 'medical_services',
      'awareness': 'campaign',
      'donation': 'favorite',
      'health': 'health_and_safety',
      'emergency': 'emergency',
      'volunteer': 'volunteer_activism',
      'community': 'groups',
      'education': 'school',
      'research': 'science'
    };
    return iconMap[tag.toLowerCase()] || 'label';
  }

  private filterEvents(): void {
    let filtered = [...this.events];

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query)
      );
    }

    // Filter by tags
    if (this.selectedTags.length > 0) {
      filtered = filtered.filter(event =>
        event.tags?.some(tag => this.selectedTags.includes(tag)) ?? false
      );
    }

    // Filter by location type
    if (this.selectedLocationType !== 'all') {
      filtered = filtered.filter(event =>
        event.location.type === this.selectedLocationType
      );
    }

    // Filter by date
    if (this.selectedDate !== 'all') {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date_time_options[0].start_time);
        switch (this.selectedDate) {
          case 'today':
            return eventDate.toDateString() === today.toDateString();
          case 'tomorrow':
            return eventDate.toDateString() === tomorrow.toDateString();
          case 'week':
            return eventDate >= today && eventDate <= nextWeek;
          default:
            return true;
        }
      });
    }

    this.filteredEvents = filtered;
  }

  onTagChange(tag: string, checked: boolean): void {
    if (checked) {
      this.selectedTags.push(tag);
    } else {
      this.selectedTags = this.selectedTags.filter(t => t !== tag);
    }
    this.filterEvents();
  }

  onLocationTypeChange(type: 'all' | 'online' | 'offline'): void {
    this.selectedLocationType = type;
    this.filterEvents();
  }

  onDateChange(date: 'all' | 'today' | 'tomorrow' | 'week'): void {
    this.selectedDate = date;
    this.filterEvents();
  }

  viewEventDetails(eventId: string | undefined): void {
    if (eventId) {
      this.router.navigate(['/detail-event', eventId]);
    }
  }
  
  // Map related methods
  openFullMap(): void {
    this.isFullMapOpen = true;
  }
  
  closeFullMap(): void {
    this.isFullMapOpen = false;
  }
  
  continueWithAddress(): void {
    this.showLocationConfirm = false;
  }
  
  useGPSLocation(): void {
    this.showLocationConfirm = false;
    // Implement GPS location functionality if needed
  }
} 