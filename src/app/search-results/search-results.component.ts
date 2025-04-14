import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EventsService } from '../service/events.service';
import { EventList } from '../types/eventstype';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.css']
})
export class SearchResultsComponent implements OnInit, OnDestroy, AfterViewInit {
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
  map: L.Map | null = null;
  markers: L.Marker[] = [];
  userMarker: L.Marker | null = null;
  userLocation: { latitude: number; longitude: number } | null = null;
  
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
  isLocating: boolean = false;

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

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initializeMap(): void {
    if (this.mapContainer && !this.map) {
      // Initialize map with default center (you can adjust these coordinates)
      this.map = L.map(this.mapContainer.nativeElement).setView([51.505, -0.09], 13);
      
      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      // Update markers when filtered events change
      this.updateMarkers();
    }
  }

  private updateMarkers(): void {
    if (!this.map) return;

    // Clear existing markers
    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    // Add markers for each event with location
    this.filteredEvents.forEach(event => {
      if (event.location && event.location.type === 'offline' && event.location.coordinates) {
        const marker = L.marker([
          event.location.coordinates.latitude,
          event.location.coordinates.longitude
        ]).addTo(this.map!);

        // Add popup with event information
        marker.bindPopup(`
          <div class="event-popup">
            <h3>${event.name}</h3>
            <p>${event.description}</p>
            <button onclick="window.location.href='/event/${event.id}'">View Details</button>
          </div>
        `);

        this.markers.push(marker);
      }
    });

    // Fit map bounds to show all markers if there are any
    if (this.markers.length > 0) {
      const bounds = L.latLngBounds(this.markers.map(marker => marker.getLatLng()));
      this.map.fitBounds(bounds);
    }
  }

  // Get user's current location
  getUserLocation(): void {
    if (!this.map) return;
    
    this.isLocating = true;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.userLocation = { latitude, longitude };
          
          // Remove existing user marker if any
          if (this.userMarker) {
            this.userMarker.remove();
          }
          
          // Create a custom icon for user location
          const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<span class="material-icons">location_on</span>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
          });
          
          // Add marker for user location
          this.userMarker = L.marker([latitude, longitude], { icon: userIcon })
            .addTo(this.map!)
            .bindPopup('Your current location');
          
          // Pan map to user location
          this.map!.panTo([latitude, longitude]);
          
          this.isLocating = false;
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

  // Calculate distance between user and event
  calculateDistance(event: EventList): number | null {
    if (!this.userLocation || !event.location?.coordinates) {
      return null;
    }
    
    const userLat = this.userLocation.latitude;
    const userLng = this.userLocation.longitude;
    const eventLat = event.location.coordinates.latitude;
    const eventLng = event.location.coordinates.longitude;
    
    // Haversine formula to calculate distance between two points on Earth
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(eventLat - userLat);
    const dLon = this.deg2rad(eventLng - userLng);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(userLat)) * Math.cos(this.deg2rad(eventLat)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
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
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);

      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date_time_options[0].start_time);
        switch (this.selectedDate) {
          case 'today':
            return eventDate.toDateString() === now.toDateString();
          case 'tomorrow':
            return eventDate.toDateString() === tomorrow.toDateString();
          case 'week':
            return eventDate >= now && eventDate <= nextWeek;
          default:
            return true;
        }
      });
    }

    this.filteredEvents = filtered;
    this.updateMarkers(); // Update markers when filtered events change
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
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 100);
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