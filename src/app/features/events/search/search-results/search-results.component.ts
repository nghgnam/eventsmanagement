import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { EventsService } from '../../../../core/services/events.service';
import { EventList } from '../../../../core/models/eventstype';
import { ImageErrorHandlerDirective } from '../../../../shared/directives/image-error-handler.directive';
@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ImageErrorHandlerDirective],
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.css']
})
export class SearchResultsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private eventsService = inject(EventsService);
  private platformId = inject(PLATFORM_ID);

  events: EventList[] = [];
  filteredEvents: EventList[] = [];
  searchQuery: string = '';
  isLoading: boolean = true;
  subscription: Subscription = new Subscription();
  availableTags: string[] = [];
  selectedTags: string[] = [];
  selectedLocationType: 'all' | 'online' | 'offline' = 'all';
  selectedDate: 'all' | 'today' | 'tomorrow' | 'week' = 'all';
  userLocation: { latitude: number; longitude: number } | null = null;
  isLocating = false;
  
  // Properties for filter UI
  showFilters: boolean = false;
  activeFilters: number = 0;
  filters = {
    tags: {} as { [key: string]: boolean },
    date: 'all',
    locationType: 'all',
    maxDistance: 50 // Maximum distance in kilometers
  };
  
  // Properties for location functionality
  showLocationConfirm: boolean = false;

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
  }
  
  getUserLocation(): void {
    // Only get location on browser, not during SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    this.isLocating = true;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.userLocation = { latitude, longitude };
          console.log('User location:', this.userLocation);
          this.isLocating = false;
          // Re-filter events to sort by distance
          this.filterEvents();
        },
        (error) => {
          console.error('Error getting user location:', error);
          this.isLocating = false;
          alert('Unable to get your location. Please check your browser settings.');
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      this.isLocating = false;
      alert('Geolocation is not supported by your browser.');
    }
  }

  calculateDistance(event: EventList): number | null {
    const coordinates = event.location.coordinates;
    if (
      !this.userLocation ||
      !coordinates ||
      typeof coordinates.latitude !== 'number' ||
      typeof coordinates.longitude !== 'number'
    ) {
      return null;
    }
    
    const userLat = this.userLocation.latitude;
    const userLng = this.userLocation.longitude;
    const eventLat = coordinates.latitude;
    const eventLng = coordinates.longitude;

    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(eventLat - userLat);
    const dLon = this.deg2rad(eventLng - userLng);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(userLat)) * Math.cos(this.deg2rad(eventLat)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    console.log(distance)
    return distance;
  }
  
  // Helper function to convert degrees to radians
  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
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
      .filter(([selected]) => selected)
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
    this.filteredEvents = this.events.filter(event => {
      // Filter by search query
      if (this.searchQuery && !event.name.toLowerCase().includes(this.searchQuery.toLowerCase())) {
        return false;
      }

      // Filter by tags
      if (Object.keys(this.filters.tags).length > 0) {
        const hasSelectedTag = Object.entries(this.filters.tags)
          .filter(([checked]) => checked)
          .some(([tag]) => event.tags?.includes(tag));
        if (!hasSelectedTag) return false;
      }

      // Filter by date
      if (this.filters.date !== 'all') {
        const eventDate = new Date(event.date_time_options[0].start_time);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        switch (this.filters.date) {
          case 'today':
            if (eventDate.toDateString() !== today.toDateString()) return false;
            break;
          case 'tomorrow':
            if (eventDate.toDateString() !== tomorrow.toDateString()) return false;
            break;
          case 'week':
            if (eventDate < today || eventDate > nextWeek) return false;
            break;
        }
      }

      // Filter by location type
      if (this.filters.locationType !== 'all' && event.location.type !== this.filters.locationType) {
        return false;
      }

      // Filter by distance if user location is available
      const cityCoordinates = event.location.city?.coordinates;
      if (
        this.userLocation &&
        event.location.type === 'offline' &&
        typeof cityCoordinates?.latitude === 'number' &&
        typeof cityCoordinates?.longitude === 'number'
      ) {
        const distance = this.calculateDistance(event);
        if (distance === null || distance > this.filters.maxDistance) {
          return false;
        }
      }

      return true;
    });

    // Sort events by distance if user location is available
    if (this.userLocation) {
      this.filteredEvents.sort((a, b) => {
        if (a.location.type === 'online' && b.location.type === 'offline') return 1;
        if (a.location.type === 'offline' && b.location.type === 'online') return -1;
        if (a.location.type === 'online' && b.location.type === 'online') return 0;
        
        const distanceA = this.calculateDistance(a);
        const distanceB = this.calculateDistance(b);
        
        if (distanceA === null && distanceB === null) return 0;
        if (distanceA === null) return 1;
        if (distanceB === null) return -1;
        
        return distanceA - distanceB;
      });
    }
  }

  formatDistance(event: EventList): string {
    const cityCoordinates = event.location.city?.coordinates;
    if (
      !this.userLocation ||
      event.location.type === 'online' ||
      typeof cityCoordinates?.latitude !== 'number' ||
      typeof cityCoordinates?.longitude !== 'number'
    ) {
      return '';
    }

    const distance = this.calculateDistance(event);
    if (distance === null) {
      return '';
    }

    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
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
      this.router.navigate(['/detail', eventId]);
    }
  }
  
  continueWithAddress(): void {
    this.showLocationConfirm = false;
  }
  
  useGPSLocation(): void {
    this.showLocationConfirm = false;
    this.getUserLocation();
  }
} 
