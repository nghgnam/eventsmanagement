import { Component, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BodyEventsDataListingComponent } from './body-events-data-listing.component';
import { AllEventsListingComponent } from './all-events-listing.component';
import { UsersService } from '../../../core/services/users.service';
import { User } from '../../../core/models/userstype';
import { getAuth } from 'firebase/auth';

@Component({
  selector: 'app-body-events-listing',
  standalone: true,
  imports: [CommonModule, FormsModule, BodyEventsDataListingComponent, AllEventsListingComponent],
  templateUrl: './body-events-listing.component.html',
  styleUrls: ['./body-events-listing.component.css']
})
export class BodyEventsListingComponent implements OnInit {
  private usersService = inject(UsersService);

  @Output() filterChanged = new EventEmitter<string>();
  @Output() locationChanged = new EventEmitter<string>();
  selectedFilter: string = 'all';
  location: string = '';
  placeholder: string = 'Enter location';
  showLocationOptions = false;
  currentUser: User | null = null;
  userAddress = '';
  currentLocation = '';
  isLoadingLocation = false;
  locationError = '';
  locationOptions: string[] = [];

  filters = [
    { label: 'All', value: 'all' },
    { label: 'For you', value: 'foryou' },
    { label: 'Online', value: 'online' },
    { label: 'Today', value: 'today' },
    { label: 'This weekend', value: 'weekend' },
    { label: 'Free', value: 'free' },
    { label: 'Music', value: 'music' },
    { label: 'Food & Drink', value: 'food' }
  ];

  private auth = getAuth();

  ngOnInit(): void {
    this.initLocationOptions();
    this.subscribeToUser();
  }

  private initLocationOptions() {
    this.locationOptions = [
      'New York, NY',
      'Los Angeles, CA',
      'Chicago, IL',
      'Houston, TX',
      'Phoenix, AZ'
    ];
  }

  private subscribeToUser(): void {
    this.auth.onAuthStateChanged(user => {
      if (!user) {
        this.currentUser = null;
        this.userAddress = '';
        return;
      }

      this.usersService.getCurrentUserById(user.uid).subscribe(userData => {
        if (userData) {
          this.currentUser = userData;
          this.userAddress = this.buildUserAddress(userData);
        }
      });
    });
  }

  toggleLocationOptions(): void {
    this.showLocationOptions = !this.showLocationOptions;
  }

  getCurrentLocation(): void {
    this.isLoadingLocation = true;
    this.locationError = '';

    if (!navigator.geolocation) {
      this.locationError = 'Geolocation is not supported by your browser';
      this.isLoadingLocation = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => this.reverseGeocode(position.coords.latitude, position.coords.longitude),
      error => {
        this.isLoadingLocation = false;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.locationError = 'User denied the request for Geolocation';
            break;
          case error.POSITION_UNAVAILABLE:
            this.locationError = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            this.locationError = 'The request to get user location timed out';
            break;
          default:
            this.locationError = 'An unknown error occurred';
        }
      }
    );
  }

  reverseGeocode(latitude: number, longitude: number): void {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
      .then(response => response.json())
      .then(data => {
        this.isLoadingLocation = false;
        if (data?.display_name) {
          this.currentLocation = data.display_name;
          this.location = this.currentLocation;
          this.updateLocation();

          if (this.currentUser?.id) {
            this.usersService.updateUserLocation(String(this.currentUser.id), {
              latitude,
              longitude,
              timestamp: Date.now()
            }).subscribe();
          }
        } else {
          this.locationError = 'Could not determine location name';
        }
      })
      .catch(error => {
        console.error('Reverse geocoding error:', error);
        this.isLoadingLocation = false;
        this.locationError = 'Error getting location details';
      });
  }

  useUserAddress(): void {
    if (this.userAddress) {
      this.location = this.userAddress;
      this.updateLocation();
    }
  }

  updateLocation(): void {
    this.locationChanged.emit(this.location);
    this.showLocationOptions = false;
  }

  selectFilter(filter: string): void {
    this.selectedFilter = filter;
    this.filterChanged.emit(filter);
  }

  adjustWidth(spanElement: HTMLElement, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    spanElement.textContent = inputElement.value || this.placeholder;
    inputElement.style.width = spanElement.offsetWidth + 'px';
  }

  onHover(event: Event, isHover: boolean): void {
    const target = event.target as HTMLElement;
    target.style.backgroundPosition = isHover ? '0' : '-100%';
  }

  selectLocation(location: string): void {
    this.location = location;
    this.locationOptions = [];
  }

  private buildUserAddress(user: User): string {
    const address = user.contact?.address;
    if (!address) {
      return '';
    }
    const segments = [
      address.details_address,
      address.wards,
      address.districts,
      address.city,
      address.country
    ]
      .filter(segment => typeof segment === 'string' && segment.trim().length > 0)
      .map(segment => (segment as string).trim());

    return segments.join(', ');
  }
}
