import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BodyEventsDataListingComponent } from '../body-events-data-listing/body-events-data-listing.component';
import { AllEventsListingComponent } from '../all-events-listing/all-events-listing.component';
import { UsersService } from '../../service/users.service';
import { AuthService } from '../../service/auth.service';
import { getAuth } from 'firebase/auth';
import { User } from '../../types/userstype';

@Component({
  selector: 'app-body-events-listing',
  standalone: true,
  imports: [CommonModule, FormsModule, BodyEventsDataListingComponent, AllEventsListingComponent],
  templateUrl: './body-events-listing.component.html',
  styleUrls: ['./body-events-listing.component.css']
})
export class BodyEventsListingComponent implements OnInit {
  @Output() filterChanged = new EventEmitter<string>();
  @Output() locationChanged = new EventEmitter<string>();
  selectedFilter: string = 'all';
  location: string = '';
  placeholder: string = 'Enter location';
  showLocationOptions: boolean = false;
  currentUser: User | undefined;
  userAddress: string = '';
  currentLocation: string = '';
  isLoadingLocation: boolean = false;
  locationError: string = '';
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

  constructor(
    private usersService: UsersService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.checkUserAuth();
    // Initialize location options
    this.locationOptions = [
      'New York, NY',
      'Los Angeles, CA',
      'Chicago, IL',
      'Houston, TX',
      'Phoenix, AZ'
    ];
  }

  checkUserAuth(): void {
    const auth = getAuth();
    auth.onAuthStateChanged(user => {
      if (user) {
        this.usersService.getCurrentUserById(user.uid).subscribe(userData => {
          if (userData) {
            this.currentUser = userData;
            // Format user address
            if (userData.address) {
              this.userAddress = `${userData.address.details_address}, ${userData.address.wards}, ${userData.address.districts}, ${userData.address.city}, ${userData.address.country}`;
            }
          }
        });
      }
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
      (position) => {
        // Use reverse geocoding to get address from coordinates
        this.reverseGeocode(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
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
    // Using the free Nominatim API for reverse geocoding
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
      .then(response => response.json())
      .then(data => {
        this.isLoadingLocation = false;
        if (data && data.display_name) {
          this.currentLocation = data.display_name;
          this.location = this.currentLocation;
          this.updateLocation();
          
          // Update user's current location in the database if logged in
          if (this.currentUser) {
            this.usersService.updateUserLocation(this.currentUser.id, {
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
        this.isLoadingLocation = false;
        this.locationError = 'Error getting location details';
        console.error('Reverse geocoding error:', error);
      });
  }

  useUserAddress(): void {
    if (this.userAddress) {
      this.location = this.userAddress;
      this.updateLocation();
    }
  }

  updateLocation() {
    this.locationChanged.emit(this.location);
    this.showLocationOptions = false;
  }

  selectFilter(filter: string) {
    this.selectedFilter = filter;
    this.filterChanged.emit(filter);
  }

  adjustWidth(spanElement: HTMLElement, event: Event) {
    const inputElement = event.target as HTMLInputElement;
    spanElement.textContent = inputElement.value || this.placeholder;
    inputElement.style.width = spanElement.offsetWidth + 'px';
  }

  onHover(event: Event, isHover: boolean) {
    const target = event.target as HTMLElement;
    if (isHover) {
      target.style.backgroundPosition = '0';
    } else {
      target.style.backgroundPosition = '-100%';
    }
  }

  selectLocation(location: string): void {
    this.location = location;
    this.locationOptions = [];
  }
}
