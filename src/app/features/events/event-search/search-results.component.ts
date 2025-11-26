import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EventsService } from '../../../core/services/events.service';
import { EventList, TimestampLike } from '../../../core/models/eventstype';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { Timestamp } from 'firebase/firestore';

type ScheduleOption = Record<string, TimestampLike | string | number | null | undefined>;

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

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private eventsService = inject(EventsService);

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
      const eventType = this.getEventLocationType(event);
      const coords = this.getEventCoordinates(event);
      if (eventType === 'offline' && coords) {
        const marker = L.marker([
          coords.lat,
          coords.lng
        ]).addTo(map);

        const startTime = this.getEventStartDate(event);
        marker.bindPopup(`
          <div class="marker-popup">
            <h3>${event.core?.name ?? 'Event'}</h3>
            <p>${event.location?.address || 'No address provided'}</p>
            <p>${this.getEventType(event) ?? ''}</p>
            <p>Start Time: ${startTime ? startTime.toLocaleString() : 'TBD'}</p>
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
    if (!this.userLocation) {
      console.log("cannot get location")
      console.log(this.userLocation)
      console.log(event.location?.coordinates)
      return null;
    }
    const coords = this.getEventCoordinates(event);
    if (!coords) {
      return null;
    }
    
    const userLat = this.userLocation.latitude;
    const userLng = this.userLocation.longitude;
    const eventLat = coords.lat;
    const eventLng = coords.lng;

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
          if (event.core?.tags) {
            event.core.tags.forEach(tag => tagSet.add(tag));
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
      const eventName = event.core?.name?.toLowerCase() ?? '';
      if (this.searchQuery && !eventName.includes(this.searchQuery.toLowerCase())) {
        return false;
      }

      // Filter by tags
      if (Object.keys(this.filters.tags).length > 0) {
        const hasSelectedTag = Object.entries(this.filters.tags)
          .filter(([checked]) => checked)
          .some(([tag]) => (event.core?.tags ?? []).includes(tag));
        if (!hasSelectedTag) return false;
      }

      // Filter by date
      if (this.filters.date !== 'all') {
        const eventDate = this.getEventStartDate(event);
        if (!eventDate) {
          return false;
        }
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
      const locationType = this.getEventLocationType(event);
      if (this.filters.locationType !== 'all' && locationType !== this.filters.locationType) {
        return false;
      }

      // Filter by distance if user location is available
      if (this.userLocation && locationType === 'offline' && this.getEventCoordinates(event)) {
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
        const typeA = this.getEventLocationType(a);
        const typeB = this.getEventLocationType(b);
        if (typeA === 'online' && typeB === 'offline') return 1;
        if (typeA === 'offline' && typeB === 'online') return -1;
        if (typeA === 'online' && typeB === 'online') return 0;
        
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
    const type = this.getEventLocationType(event);
    if (!this.userLocation || type === 'online' || !this.getEventCoordinates(event)) {
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
  getEventStartDate(event: EventList): Date | null {
    const option = this.getScheduleOption(event, 0);
    const value = option ? option['start_time'] ?? option['startTime'] : event.schedule?.startDate;
    return this.toDate(value);
  }

  private getScheduleOption(event: EventList, index: number): ScheduleOption | undefined {
    return (event.schedule?.dateTimeOptions as ScheduleOption[])?.[index];
  }

  getEventTags(event: EventList): string[] {
    return event.core?.tags ?? [];
  }

  getEventImage(event: EventList): string {
    return (
      event.media?.primaryImage ||
      event.media?.coverImage ||
      'assets/images/default-event.jpg'
    );
  }

  getEventType(event: EventList): string | null {
    return event.core?.eventType ?? null;
  }

  getEventLocationType(event: EventList): 'online' | 'offline' | 'hybrid' | string | null {
    return event.location?.type ?? event.core?.eventType ?? null;
  }

  getEventLocationLabel(event: EventList): string {
    const type = this.getEventLocationType(event);
    if (type === 'online') {
      return 'Online Event';
    }
    return event.location?.address || 'No address provided';
  }

  getEventCoordinates(event: EventList): { lat: number; lng: number } | null {
    const coords = event.location?.coordinates;
    if (!coords) {
      return null;
    }
    const lat = (coords as { lat: number, longitude: number }).lat ?? (coords as { latitude: number }).latitude;
    const lng = (coords as { lng: number, longitude: number }).lng ?? (coords as { longitude: number }).longitude;
    if (typeof lat === 'number' && typeof lng === 'number') {
      return { lat, lng };
    }
    return null;
  }

  private toDate(value: TimestampLike | string | number | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    if ((value as { toDate: () => Date })?.toDate instanceof Function) {
      return (value as { toDate: () => Date }).toDate();
    }
    if (typeof value === 'object' && typeof (value as { _seconds: number })._seconds === 'number') {
      const seconds = (value as { _seconds: number })._seconds;
      const nanos = (value as { _nanoseconds: number })._nanoseconds ?? 0;
      return new Date(seconds * 1000 + nanos / 1e6);
    }
    return null;
  }
}