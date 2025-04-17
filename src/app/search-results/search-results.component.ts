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
  private map: L.Map | undefined;
  private markers: L.Marker[] = [];
  private userMarker: L.Marker | null = null;
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

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  private initializeMap(): void {
    if (this.mapContainer) {
      this.map = L.map(this.mapContainer.nativeElement).setView([10.762622, 106.660172], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);
    }
  }

  private updateMarkers(): void {
    const map = this.map;
    if (!map) return;

    // Clear existing markers
    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    // Add new markers
    this.filteredEvents.forEach(event => {
      if (event.location.type === 'offline' && event.location.coordinates) {
        const marker = L.marker([
          event.location.coordinates.latitude,
          event.location.coordinates.longitude
        ]).addTo(map);

        const startTime = event.date_time_options[0]?.start_time || 'TBD';
        marker.bindPopup(`
          <div class="marker-popup">
            <h3>${event.name}</h3>
            <p>${event.location.address || 'No address provided'}</p>
            <p>${event.event_type}</p>
            <p>Start Time: ${startTime}</p>
          </div>
        `);

        this.markers.push(marker);
      }
    });

    // Fit bounds to markers if there are any
    if (this.markers.length > 0) {
      const bounds = L.latLngBounds(this.markers.map(marker => marker.getLatLng()));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  // searchAddress(address: string){
  //   const encodedAddress = encodeURIComponent(address)
  //   const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}`;

  //   fetch(url)
  //   .then(res => res.json())
  //   .then((data) => {
  //     if (data && data.length > 0) {
  //       const lat = parseFloat(data[0].lat);
  //       const lon = parseFloat(data[0].lon);

  //       // Di chuyển bản đồ tới vị trí tìm được
  //       this.map.setView([lat, lon], 16);

  //       // Thêm marker nếu muốn
  //       L.marker([lat, lon]).addTo(this.map)
  //         .bindPopup(address)
  //         .openPopup();
  //     } else {
  //       alert("Không tìm thấy địa chỉ.");
  //     }
  //   })
  //   .catch((err) => {
  //     console.error("Geocoding error:", err);
  //   });
  // }
  
  getUserLocation(): void {
    if (!this.map) return;
    
    this.isLocating = true;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.userLocation = { latitude, longitude };
          console.log(this.userLocation)
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

  calculateDistance(event: EventList): number | null {
    if (!this.userLocation || !event.location?.coordinates) {
      console.log("cannot get location")
      console.log(this.userLocation)
      console.log(event.location?.coordinates)
      return null;
    }
    
    const userLat = this.userLocation.latitude;
    const userLng = this.userLocation.longitude;
    const eventLat = event.location.coordinates.latitude;
    const eventLng = event.location.coordinates.longitude;

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
    this.filteredEvents = this.events.filter(event => {
      // Filter by search query
      if (this.searchQuery && !event.name.toLowerCase().includes(this.searchQuery.toLowerCase())) {
        return false;
      }

      // Filter by tags
      if (Object.keys(this.filters.tags).length > 0) {
        const hasSelectedTag = Object.entries(this.filters.tags)
          .filter(([_, checked]) => checked)
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
      if (this.userLocation && event.location.type === 'offline' && event.location.coordinates) {
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

    if (this.map && this.map instanceof L.Map) {
      this.updateMarkers();
    }
  }

  formatDistance(event: EventList): string {
    if (!this.userLocation || event.location.type === 'online' || !event.location.coordinates) {
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
      this.router.navigate(['/detail-event', eventId]);
    }
  }

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
    
  }
} 