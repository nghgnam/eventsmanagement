import { Component, OnInit, inject, PLATFORM_ID, DestroyRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { BodyEventsDataListingComponent } from '../body-events-data-listing/body-events-data-listing.component';
import { PopupComponent } from '../../../../shared/components/popup/popup.component';
import { UsersService } from '../../../../core/services/users.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CategoriesService, Category } from '../../../../core/services/categories.service';
import { User } from '../../../../core/models/userstype';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EventsService } from '../../../../core/services/events.service';
import { FilterEventsPaging } from '../../../../core/models/eventstype';

@Component({
  selector: 'app-body-events-listing',
  standalone: true,
  imports: [CommonModule, FormsModule, BodyEventsDataListingComponent, PopupComponent],
  templateUrl: './body-events-listing.component.html',
  styleUrls: ['./body-events-listing.component.css']
})
export class BodyEventsListingComponent implements OnInit, AfterViewInit {
  @ViewChild('categoriesScroll', { static: false }) categoriesScrollElement!: ElementRef<HTMLDivElement>;
  
  private usersService = inject(UsersService);
  private authService = inject(AuthService);
  private categoriesService = inject(CategoriesService);
  private eventsService = inject(EventsService);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  
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
  
  // Categories
  categories: Category[] = [];
  categoriesLoading: boolean = false;
  selectedCategorySlug: string | null = null;
  selectedSpecialCategory: 'trending' | 'weekend' | null = null;
  canScrollPrev: boolean = false;
  canScrollNext: boolean = false;
  
  // Filters
  showFiltersModal: boolean = false;
  filterState = {
    dateRange: {
      startDate: null as Date | null,
      endDate: null as Date | null
    },
    priceRange: {
      min: 0,
      max: 1000
    },
    format: null as 'online' | 'offline' | null
  };
  
  private scrollHandler?: () => void;
  private wheelHandler?: (e: WheelEvent) => void;
  private resizeHandler?: () => void;
  
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

  ngOnInit(): void {
    // Only check auth on browser, not during SSR
    if (isPlatformBrowser(this.platformId)) {
      this.checkUserAuth();
      this.loadCategories();
    }
    // Initialize location options
    this.locationOptions = [
      'New York, NY',
      'Los Angeles, CA',
      'Chicago, IL',
      'Houston, TX',
      'Phoenix, AZ'
    ];
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Check scroll state after view init with multiple attempts
      // This ensures DOM is fully rendered and categories are loaded
      setTimeout(() => {
        this.updateScrollButtons();
        this.setupScrollListener();
      }, 100);
      
      // Also check after a longer delay to catch categories loading
      setTimeout(() => {
        this.updateScrollButtons();
      }, 500);
      
      // Check again after categories are loaded
      setTimeout(() => {
        this.updateScrollButtons();
      }, 1000);
    }
  }

  setupScrollListener(): void {
    if (!this.categoriesScrollElement?.nativeElement || !isPlatformBrowser(this.platformId)) {
      return;
    }

    const scrollContainer = this.categoriesScrollElement.nativeElement;
    
    // Listen to scroll events
    this.scrollHandler = () => {
      this.updateScrollButtons();
    };
    scrollContainer.addEventListener('scroll', this.scrollHandler);

    // Enable horizontal scrolling with mouse wheel
    this.wheelHandler = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        scrollContainer.scrollLeft += e.deltaY;
        // Update buttons after wheel scroll
        setTimeout(() => this.updateScrollButtons(), 50);
      }
    };
    scrollContainer.addEventListener('wheel', this.wheelHandler, { passive: false });

    // Update scroll buttons on window resize
    this.resizeHandler = () => {
      // Delay to ensure layout is complete
      setTimeout(() => this.updateScrollButtons(), 100);
    };
    window.addEventListener('resize', this.resizeHandler);

    // Also use MutationObserver to detect when categories list changes
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => {
        setTimeout(() => this.updateScrollButtons(), 100);
      });
      
      const categoriesList = scrollContainer.querySelector('.categories-list');
      if (categoriesList) {
        observer.observe(categoriesList, {
          childList: true,
          subtree: true,
          attributes: true
        });
      }
      
      // Cleanup observer on destroy
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
      });
    }

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      if (this.scrollHandler && scrollContainer) {
        scrollContainer.removeEventListener('scroll', this.scrollHandler);
      }
      if (this.wheelHandler && scrollContainer) {
        scrollContainer.removeEventListener('wheel', this.wheelHandler);
      }
      if (this.resizeHandler && isPlatformBrowser(this.platformId)) {
        window.removeEventListener('resize', this.resizeHandler);
      }
    });
  }

  loadCategories(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    console.log('[BodyEventsListing] Loading categories...');
    this.categoriesLoading = true;
    this.categoriesService.getCategories().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (categories) => {
        console.log('[BodyEventsListing] Categories loaded:', categories.length, categories);
        this.categories = categories;
        this.categoriesLoading = false;
        // Update scroll buttons after categories load - multiple attempts to ensure DOM is ready
        setTimeout(() => this.updateScrollButtons(), 100);
        setTimeout(() => this.updateScrollButtons(), 300);
        setTimeout(() => this.updateScrollButtons(), 500);
      },
      error: (error) => {
        console.error('[BodyEventsListing] Failed to load categories', error);
        this.categoriesLoading = false;
        this.categories = [];
      }
    });
  }

  scrollCategories(direction: 'prev' | 'next'): void {
    if (!this.categoriesScrollElement?.nativeElement) {
      return;
    }

    const scrollContainer = this.categoriesScrollElement.nativeElement;
    const scrollAmount = 300; // pixels to scroll
    
    if (direction === 'prev') {
      scrollContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }

    // Update button states after scroll
    setTimeout(() => this.updateScrollButtons(), 300);
  }

  updateScrollButtons(): void {
    if (!this.categoriesScrollElement?.nativeElement) {
      console.log('[BodyEventsListing] Scroll element not found');
      return;
    }

    const scrollContainer = this.categoriesScrollElement.nativeElement;
    const scrollLeft = scrollContainer.scrollLeft || 0;
    const scrollWidth = scrollContainer.scrollWidth || 0;
    const clientWidth = scrollContainer.clientWidth || 0;
    
    // Add small threshold (1px) to handle rounding issues
    const canScrollPrevValue = scrollLeft > 1;
    const canScrollNextValue = scrollLeft < scrollWidth - clientWidth - 1;
    
    // console.log('[BodyEventsListing] Scroll state:', {
    //   scrollLeft,
    //   scrollWidth,
    //   clientWidth,
    //   canScrollPrev: canScrollPrevValue,
    //   canScrollNext: canScrollNextValue,
    //   needsScroll: scrollWidth > clientWidth
    // });
    
    this.canScrollPrev = canScrollPrevValue;
    this.canScrollNext = canScrollNextValue;
  }

  selectCategory(category: Category): void {
    this.selectedCategorySlug = category.slug;
    this.selectedSpecialCategory = null;
    // Cập nhật filter BE theo category
    this.pushFilterUpdate({
      category: category.slug,
      page: 1,
    });
  }

  selectSpecialCategory(type: 'trending' | 'weekend'): void {
    this.selectedSpecialCategory = type;
    this.selectedCategorySlug = null;

    if (type === 'weekend') {
      // Set date range to this weekend
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysUntilSaturday = 6 - dayOfWeek;
      const saturday = new Date(today);
      saturday.setDate(today.getDate() + daysUntilSaturday);
      const sunday = new Date(saturday);
      sunday.setDate(saturday.getDate() + 1);
      
      this.filterState.dateRange.startDate = saturday;
      this.filterState.dateRange.endDate = sunday;
    } else if (type === 'trending') {
      // Trending: chỉ set sort phổ biến, không giới hạn dateRange
      this.filterState.dateRange.startDate = null;
      this.filterState.dateRange.endDate = null;
    }

    this.applyFilters();
  }

  get activeFiltersCount(): number {
    let count = 0;
    if (this.filterState.dateRange.startDate || this.filterState.dateRange.endDate) count++;
    if (this.filterState.priceRange.min > 0 || this.filterState.priceRange.max < 1000) count++;
    if (this.filterState.format) count++;
    return count;
  }

  openFilters(): void {
    this.showFiltersModal = true;
  }

  closeFilters(): void {
    this.showFiltersModal = false;
  }

  applyFilters(): void {
    // Đẩy toàn bộ filter sang EventsService (BE /search-filter)
    this.pushFilterUpdate({
      startDate: this.filterState.dateRange.startDate ? this.filterState.dateRange.startDate.toISOString() : null,
      endDate: this.filterState.dateRange.endDate ? this.filterState.dateRange.endDate.toISOString() : null,
      minPrice: this.filterState.priceRange.min > 0 ? this.filterState.priceRange.min : null,
      maxPrice: this.filterState.priceRange.max < 1000 ? this.filterState.priceRange.max : null,
      type: this.filterState.format,
      // Nếu chọn trending, có thể map sang sort=popular
      sort: this.selectedSpecialCategory === 'trending' ? 'popular' : null,
      page: 1,
    });
    this.closeFilters();
  }

  clearFilters(): void {
    this.filterState = {
      dateRange: {
        startDate: null,
        endDate: null
      },
      priceRange: {
        min: 0,
        max: 1000
      },
      format: null
    };
    this.selectedSpecialCategory = null;
    // Reset toàn bộ filter ở BE
    this.pushFilterUpdate({
      startDate: null,
      endDate: null,
      minPrice: null,
      maxPrice: null,
      type: null,
      sort: null,
      category: null,
      page: 1,
    });
  }

  onDateRangeChange(start: string | null, end: string | null): void {
    if (start) {
      this.filterState.dateRange.startDate = new Date(start);
    } else {
      this.filterState.dateRange.startDate = null;
    }
    if (end) {
      this.filterState.dateRange.endDate = new Date(end);
    } else {
      this.filterState.dateRange.endDate = null;
    }
  }

  onPriceRangeChange(min: number, max: number): void {
    // Ensure min <= max
    if (min > max) {
      const temp = min;
      min = max;
      max = temp;
    }
    this.filterState.priceRange.min = Math.max(0, Math.min(1000, min));
    this.filterState.priceRange.max = Math.max(0, Math.min(1000, max));
  }

  onFormatChange(format: 'online' | 'offline' | null): void {
    this.filterState.format = format;
  }

  onLocationBlur(): void {
    // Delay hiding options to allow click events
    setTimeout(() => {
      this.showLocationOptions = false;
    }, 200);
  }

  checkUserAuth(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    // Use AuthService.onAuthStateChanged() instead of direct Firebase call
    this.authService.onAuthStateChanged().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(user => {
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
      } else {
        this.currentUser = undefined;
        this.userAddress = '';
      }
    });
  }

  toggleLocationOptions(): void {
    this.showLocationOptions = !this.showLocationOptions;
  }

  getCurrentLocation(): void {
    // Only get location on browser, not during SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
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
            this.usersService.updateUserLocation(this.currentUser.id as string, {
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
    this.showLocationOptions = false;
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
    this.showLocationOptions = false;
    this.updateLocation();
  }

  onLocationInput(value: string): void {
    this.location = value;
    // Push partial update while typing
    this.pushFilterUpdate({
      city: value ? value.replace(/\s+/g, '_') : null,
      page: 1,
    });
  }

  private pushFilterUpdate(partial: Partial<FilterEventsPaging>) {
    this.eventsService.updateFilter(partial);
  }
}
