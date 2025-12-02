/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  inject
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as countriesLib from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';

import { EventList } from '../../../../core/models/eventstype';
import { User } from '../../../../core/models/userstype';
import { AddressInformationService } from '../../../../core/services/addressInformation.service';
import { CloudinaryService } from '../../../../core/services/cloudinary.service';
import { EventsService } from '../../../../core/services/events.service';
import { CURRENCIES, Currency, getDefaultCurrency } from '../../../../core/models/currencies';
import { NgSelectModule } from '@ng-select/ng-select';
import { CategoriesService, Category } from '../../../../core/services/categories.service';

interface CloudinaryResponse {
  secure_url: string;
}

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgSelectModule],
  templateUrl: './create-event.component.html',
  styleUrls: ['../manage-events/manage-events.component.css', './create-event.component.css']
})
export class CreateEventComponent implements OnInit, OnDestroy {
  @Input() currentUser: User | undefined;
  @Output() cancelled = new EventEmitter<void>();
  @Output() created = new EventEmitter<string>();
  @Output() createError = new EventEmitter<string>();

  private fb = inject(FormBuilder);
  private location = inject(AddressInformationService);
  private cloudinaryService = inject(CloudinaryService);
  private eventsService = inject(EventsService);
  private platformId = inject(PLATFORM_ID);
  private categoriesService = inject(CategoriesService);

  eventForm: FormGroup;
  isLoading = false;
  imageError = '';
  coverImageFile: File | null = null;
  coverImageUrl: string | null = null;
  imagePreviewUrl: string | null = null;
  galleryImages: string[] = [];
  isUploadingGallery = false;
  isOffline = true;
  isHybird = false;
  countries: { code: string; name: string }[] = [];
  citiesValue: any[] = [];
  districtsValue: any[] = [];
  wardsValue: any[] = [];
  districtsWithCities: any[] = [];
  wardsWithDistricts: any[] = [];
  availableCategories: Category[] = [];
  categoriesLoading = false;
  categoriesError = '';
  wizardSteps: string[] = ['General Info & Media', 'Time & Location', 'Tickets & Capacity', 'Review & Submit'];
  currentStep = 1;
  readonly maxSteps = 4;
  currencies: (Currency & { displayText: string })[] = CURRENCIES.map(c => ({
    ...c,
    displayText: `${c.flag || ''} ${c.code} - ${c.symbol} ${c.name}`
  }));

  private locationSubscriptions: Subscription[] = [];
  private formSubscriptions: Subscription[] = [];
  private geocodingCache: Map<string, { lat: number; lon: number }> = new Map();
  private lastGeocodingRequest = 0;
  private readonly GEOCODING_DELAY = 1000;

  constructor() {
    this.eventForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      shortDescription: ['', [Validators.required, Validators.maxLength(140)]],
      content: ['', [Validators.required]],
      category: [[]],
      tags: [''],
      eventType: ['offline', Validators.required],
      location: ['', Validators.required],
      details_address: ['', Validators.required],
      wards: ['', Validators.required],
      districts: ['', Validators.required],
      country: ['', Validators.required],
      city: ['', Validators.required],
      price: [0, [Validators.min(0)]],
      displayPrice: [0, [Validators.min(0)]],
      maxAttendees: [100, [Validators.min(1)]],
      currency: [getDefaultCurrency().code, Validators.required],
      dateSlots: this.fb.array([this.createDateSlotGroup()]),
      tickets: this.fb.array([this.createTicketGroup()])
    });
    countriesLib.registerLocale(en);
    this.countries = this.getCountryList();
  }

  get details_address() { return this.eventForm.get('details_address'); }
  get wards() { return this.eventForm.get('wards'); }
  get districts() { return this.eventForm.get('districts'); }
  get country() { return this.eventForm.get('country'); }
  get city() { return this.eventForm.get('city'); }
  get locationControl() { return this.eventForm.get('location'); }
  get dateSlots(): FormArray { return this.eventForm.get('dateSlots') as FormArray; }
  get tickets(): FormArray { return this.eventForm.get('tickets') as FormArray; }
  get dateSlotGroups(): FormGroup[] { return this.dateSlots.controls as FormGroup[]; }
  get ticketGroups(): FormGroup[] { return this.tickets.controls as FormGroup[]; }
  get formValueSnapshot() { return this.eventForm.value; }

  ngOnInit(): void {
    this.loadLocationData();
    this.setupFormListeners();
    this.initializeEventTypeState();
    this.loadAvailableCategories();
  }

  ngOnDestroy(): void {
    this.locationSubscriptions.forEach(sub => sub.unsubscribe());
    this.locationSubscriptions = [];
    this.formSubscriptions.forEach(sub => sub.unsubscribe());
    this.formSubscriptions = [];
    this.resetImagePreview();
  }

  handleCancel(): void {
    this.resetFormState();
    this.cancelled.emit();
  }

  nextStep(): void {
    if (this.currentStep >= this.maxSteps) {
      return;
    }
    if (this.isStepValid(this.currentStep)) {
      this.currentStep += 1;
    } else {
      this.markStepAsTouched(this.currentStep);
      this.createError.emit('Please complete the required fields before continuing.');
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep -= 1;
    }
  }

  toggleCategory(category: Category): void {
    const categories = new Set<string>(this.eventForm.value.category || []);
    if (categories.has(category.slug)) {
      categories.delete(category.slug);
    } else {
      categories.add(category.slug);
    }
    this.eventForm.patchValue({ category: Array.from(categories) });
  }
  isCategorySelected(category: Category): boolean {
    return (this.eventForm.value.category || []).includes(category.slug);
  }


  async onSubmit(): Promise<void> {
    if (this.currentStep !== this.maxSteps) {
      this.nextStep();
      return;
    }

    if (!this.eventForm.valid) {
      this.eventForm.markAllAsTouched();
        this.createError.emit('Please fill in all required fields correctly');
      return;
    }

    this.isLoading = true;
    const formData = this.eventForm.value;

    if (this.coverImageFile && !this.coverImageUrl) {
      const uploadedCover = await this.uploadImage(this.coverImageFile);
      if (!uploadedCover) {
        this.isLoading = false;
        this.createError.emit('Failed to upload cover image. Please try again.');
        return;
      }
      this.coverImageUrl = uploadedCover;
    }

    const wardsControlValue = this.eventForm.get('wards')?.value;
    const districtsControlValue = this.eventForm.get('districts')?.value;
    const cityControlValue = this.eventForm.get('city')?.value;
    const countryControlValue = this.eventForm.get('country')?.value;

    const wards = this.getLocationName(wardsControlValue);
    const districts = this.getLocationName(districtsControlValue);
    const city = this.getLocationName(cityControlValue);
    const country = this.getLocationName(countryControlValue);

    const addressDetails = `${formData.details_address}, ${wards}, ${districts}, ${city}, ${country}`
      .replace(/\s+,/g, ',')
      .replace(/,\s*,/g, ', ')
      .trim();
    
    let locationCoords: { lat: number; lon: number } | null = null;
    
    try {
      // Add timeout for geocoding (10 seconds)
      const geocodingPromise = this.getLanLongFromAddress(addressDetails);
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          resolve(null);
        }, 10000);
      });
      
      locationCoords = await Promise.race([geocodingPromise, timeoutPromise]);
      
      if (!locationCoords) {
        // Use default coordinates for Ho Chi Minh City if geocoding fails
        locationCoords = {
          lat: 10.7769,
          lon: 106.7009
        };
      }
    } catch (error) {
      // Use default coordinates if geocoding fails
      locationCoords = {
        lat: 10.7769,
        lon: 106.7009
      };
    }

    const lat = locationCoords.lat;
    const lon = locationCoords.lon;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tags = formData.tags
      ? formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => !!tag)
      : [];
    const nowIso = new Date().toISOString();
    const dateSlots = formData.dateSlots?.length ? formData.dateSlots : [];
    const ticketsCatalog = (formData.tickets || []).filter((ticket: any) => ticket.name);
    const displayPrice = formData.displayPrice || (ticketsCatalog.length
      ? Math.min(...ticketsCatalog.map((ticket: any) => Number(ticket.price) || 0))
      : formData.price);

    const newEvent: Partial<EventList> = {
      core: {
        id: '',
        name: formData.name,
        shortDescription: formData.shortDescription,
        description: formData.content,
        content: formData.content,
        category: formData.category || [],
        tags,
        eventType: formData.eventType,
        price: displayPrice ?? 0
      },
      status: {
        visibility: 'public',
        featured: false,
        state: 'published',
        deletedAt: null
      },
      media: {
        coverImage: this.coverImageUrl || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg',
        primaryImage: this.coverImageUrl || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg',
        gallery: this.galleryImages,
        image_url: this.coverImageUrl || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg'
      },
      schedule: {
        startDate: dateSlots[0]?.startDate,
        endDate: dateSlots[0]?.endDate,
        dateTimeOptions: dateSlots.map((slot: any) => ({
          start_time: slot.startDate,
          end_time: slot.endDate,
          time_zone: timezone
        })),
        timezone
      },
      location: {
        type: formData.eventType,
        address: addressDetails,
        city: cityControlValue ? (typeof cityControlValue === 'string' ? { name: cityControlValue } : cityControlValue) : null,
        district: districtsControlValue ? (typeof districtsControlValue === 'string' ? { name: districtsControlValue } : districtsControlValue) : null,
        ward: wardsControlValue ? (typeof wardsControlValue === 'string' ? { name: wardsControlValue } : wardsControlValue) : null,
        country: countryControlValue
          ? (typeof countryControlValue === 'string'
            ? { name: countryControlValue }
            : countryControlValue.name
              ? { name: countryControlValue.name }
              : countryControlValue)
          : null,
        coordinates: {
          lat,
          lng: lon,
          latitude: lat,
          longitude: lon
        }
      },
      organizer: {
        id: String(this.currentUser?.id || '0'),
        name: this.currentUser?.fullName || this.currentUser?.profile?.fullName || '',
        followers: this.currentUser?.social?.followers ?? 0,
        profileImage: this.currentUser?.profileImage || this.currentUser?.profile?.avatar || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1744575077/default-avatar_br3ffh.png'
      },
      tickets: {
        catalog: ticketsCatalog,
        capacity: formData.maxAttendees ?? null,
        maxAttendees: formData.maxAttendees ?? null
      },
      engagement: {
        attendeesCount: 0,
        likesCount: 0,
        viewCount: 0,
        searchTerms: []
      },
      metadata: {
        currency: formData.currency || 'VND'
      },
      timeline: {
        createdAt: nowIso,
        updatedAt: nowIso
      },
      name: formData.name,
      description: formData.shortDescription,
      content: formData.content,
      date_time_options: dateSlots.map((slot: any) => ({
        start_time: slot.startDate,
        end_time: slot.endDate,
        time_zone: timezone
      })),
      image_url: this.coverImageUrl || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg',
      price: displayPrice,
      max_attendees: formData.maxAttendees,
      tags,
      event_type: formData.eventType,
      created_at: nowIso,
      updated_at: nowIso
    };

    const subscription = this.eventsService.addEvent(newEvent as EventList).subscribe({
      next: () => {
        this.isLoading = false;
        this.created.emit('Event created successfully');
        this.resetFormState();
      },
      error: (err: unknown) => {
        this.isLoading = false;
        const errorMessage = err instanceof Error ? err.message : 'Failed to create event';
        this.createError.emit(errorMessage);
      },
      complete: () => {
      }
    });

  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) {
      return;
    }

    const file = input.files[0];

    if (file.size > 5 * 1024 * 1024) {
      this.imageError = 'Image size should be less than 5MB';
      return;
    }

    if (!file.type.match(/image\/(jpeg|png|gif|jpg)/)) {
      this.imageError = 'Only JPG, PNG and GIF images are allowed';
      return;
    }

    if (isPlatformBrowser(this.platformId)) {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        if (img.width < 800 || img.height < 600) {
          this.imageError = 'Image dimensions should be at least 800x600 pixels';
          URL.revokeObjectURL(img.src);
          return;
        }
        this.coverImageFile = file;
        this.coverImageUrl = null;
        this.imageError = '';
        this.resetImagePreview();
        this.imagePreviewUrl = img.src;
      };
    } else {
      this.coverImageFile = file;
      this.coverImageUrl = null;
    }
  }

  async onGallerySelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files.length) {
      return;
    }

    const files = Array.from(input.files);
    try {
      this.isUploadingGallery = true;
      const uploadResults = await Promise.all(
        files.map(file => this.uploadImage(file))
      );
      this.galleryImages = [
        ...this.galleryImages,
        ...uploadResults.filter((url): url is string => Boolean(url))
      ];
    } catch (err) {
      this.createError.emit('Failed to upload some gallery images');
    } finally {
      this.isUploadingGallery = false;
      if (input) {
        input.value = '';
      }
    }
  }

  removeGalleryImage(index: number): void {
    this.galleryImages = this.galleryImages.filter((_, idx) => idx !== index);
  }

  removeImage(): void {
    this.coverImageFile = null;
    this.coverImageUrl = null;
    this.imageError = '';
    this.resetImagePreview();
    if (isPlatformBrowser(this.platformId)) {
      const fileInput = document.getElementById('image') as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  }

  triggerImageUpload(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const fileInput = document.getElementById('image') as HTMLInputElement | null;
    fileInput?.click();
  }

  addDateSlot(): void {
    this.dateSlots.push(this.createDateSlotGroup());
  }

  removeDateSlot(index: number): void {
    if (this.dateSlots.length > 1) {
      this.dateSlots.removeAt(index);
    }
  }

  addTicketType(): void {
    this.tickets.push(this.createTicketGroup());
  }

  removeTicketType(index: number): void {
    if (this.tickets.length > 1) {
      this.tickets.removeAt(index);
    }
  }

  private initializeEventTypeState(): void {
    const eventTypeControl = this.eventForm.get('eventType');
    const sub = eventTypeControl?.valueChanges.subscribe(value => {
      this.isOffline = value === 'offline';
      this.isHybird = value === 'hybrid';
    });
    if (sub) {
      this.formSubscriptions.push(sub);
    }
    const value = eventTypeControl?.value;
    this.isOffline = value === 'offline';
    this.isHybird = value === 'hybrid';
  }

  private loadAvailableCategories(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.availableCategories = [];
      return;
    }

    this.categoriesLoading = true;
    const sub = this.categoriesService.getCategories().subscribe({
      next: (categories) => {
        this.availableCategories = categories;
        this.categoriesError = categories.length ? '' : 'No categories available';
        this.categoriesLoading = false;
      },
      error: (error) => {
        console.error('Failed to load categories:', error);
        this.availableCategories = [];
        this.categoriesError = 'Failed to load categories';
        this.categoriesLoading = false;
      }
    });

    this.formSubscriptions.push(sub);
  }

  private getDefaultCategorySlugs(count = 2): string[] {
    if (!this.availableCategories.length) {
      return [];
    }
    return this.availableCategories.slice(0, count).map(cat => cat.slug);
  }

  private loadLocationData(): void {
    this.locationSubscriptions.push(
      this.location.getCities().subscribe(cities => {
        this.citiesValue = (cities as any[]) || [];
      })
    );
    this.locationSubscriptions.push(
      this.location.getDistricts().subscribe(districts => {
        this.districtsValue = (districts as any[]) || [];
      })
    );
    this.locationSubscriptions.push(
      this.location.getWards().subscribe(wards => {
        this.wardsValue = (wards as any[]) || [];
      })
    );
  }

  private setupFormListeners(): void {
    const citySub = this.eventForm.get('city')?.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(selectedCity => {
        if (selectedCity && selectedCity.code) {
          this.districtsWithCities = this.districtsValue.filter(
            district => district.parent_code === selectedCity.code
          );
          this.eventForm.get('districts')?.reset();
          this.eventForm.get('wards')?.reset();
          this.wardsWithDistricts = [];
        } else {
          this.districtsWithCities = [];
          this.wardsWithDistricts = [];
        }
      });

    const districtSub = this.eventForm.get('districts')?.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(selectedDistrict => {
        if (selectedDistrict && selectedDistrict.code) {
          this.wardsWithDistricts = this.wardsValue.filter(
            ward => ward.parent_code === selectedDistrict.code
          );
          this.eventForm.get('wards')?.reset();
        } else {
          this.wardsWithDistricts = [];
        }
      });

    if (citySub) {
      this.formSubscriptions.push(citySub);
    }
    if (districtSub) {
      this.formSubscriptions.push(districtSub);
    }
  }

  private resetFormState(): void {
    this.eventForm.reset({
      name: '',
      shortDescription: '',
      content: '',
      category: [],
      tags: '',
      eventType: 'offline',
      location: '',
      details_address: '',
      wards: '',
      districts: '',
      country: '',
      city: '',
      price: 0,
      displayPrice: 0,
      maxAttendees: 100
    });
    while (this.dateSlots.length > 0) {
      this.dateSlots.removeAt(0);
    }
    this.dateSlots.push(this.createDateSlotGroup());
    while (this.tickets.length > 0) {
      this.tickets.removeAt(0);
    }
    this.tickets.push(this.createTicketGroup());
    this.isOffline = true;
    this.isHybird = false;
    this.districtsWithCities = [];
    this.wardsWithDistricts = [];
    this.galleryImages = [];
    this.removeImage();
    this.imageError = '';
    this.currentStep = 1;
  }

  private resetImagePreview(): void {
    if (this.imagePreviewUrl && isPlatformBrowser(this.platformId)) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
    this.imagePreviewUrl = null;
  }

  private getCountryList(): { code: string; name: string }[] {
    try {
      const countryObj = countriesLib.getNames('en', { select: 'official' }) || {};
      return Object.entries(countryObj).map(([code, name]) => ({
        code,
        name
      }));
    } catch (err) {
      return [];
    }
  }

  private async uploadImage(file: File): Promise<string | null> {
    if (!file) {
      return null;
    }

    try {
      return await new Promise((resolve, reject) => {
        this.cloudinaryService.upLoadImage(file).subscribe({
          next: (response: unknown) => {
            const responseData = response as CloudinaryResponse;
            if (responseData?.secure_url) {
              resolve(responseData.secure_url);
            } else {
              reject(new Error('Invalid response from Cloudinary'));
            }
          },
          error: (err: unknown) => reject(err)
        });
      });
    } catch (err) {
      return null;
    }
  }

  private getTrimmedString(value: string | undefined): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private getLocationName(value: unknown): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'string') {
      return this.getTrimmedString(value);
    }
    if (typeof value === 'object' && value !== null && 'name' in value) {
      return this.getTrimmedString((value as { name?: string }).name);
    }
    return '';
  }

  /**
   * Get current location from device and fill address form
   */
  async getCurrentLocation(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      this.createError.emit('Geolocation is not available');
      return;
    }

    if (!navigator.geolocation) {
      this.createError.emit('Geolocation is not supported by your browser');
      return;
    }

    this.isLoading = true;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Geolocation request timeout'));
        }, 10000); // 10 seconds timeout

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            resolve(pos);
          },
          (error) => {
            clearTimeout(timeoutId);
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      // Reverse geocode to get address
      const address = await this.reverseGeocode(lat, lon);
      
      if (address) {
        this.fillAddressFromGeocode(address, lat, lon);
      } else {
        // If reverse geocoding fails, at least fill coordinates
        this.fillCoordinatesOnly(lat, lon);
      }

      this.isLoading = false;
    } catch (error) {
      this.isLoading = false;
      const errorMessage = error instanceof Error ? error.message : 'Failed to get current location';
      this.createError.emit(`Location error: ${errorMessage}`);
    }
  }

  /**
   * Reverse geocode: Get address from coordinates
   */
  private async reverseGeocode(lat: number, lon: number): Promise<any | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'EventManagementApp/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      return data;
    } catch (err) {
      return null;
    }
  }

  /**
   * Fill address form from reverse geocoding result
   */
  private fillAddressFromGeocode(geocodeData: any, lat: number, lon: number): void {
    try {
      const address = geocodeData.address || {};
      
      // Fill detailed address
      const road = address.road || '';
      const houseNumber = address.house_number || '';
      const detailedAddress = houseNumber ? `${houseNumber} ${road}`.trim() : road;
      if (detailedAddress) {
        this.eventForm.patchValue({ details_address: detailedAddress });
      }

      // Fill country
      const countryName = address.country || '';
      if (countryName) {
        const countryOption = this.countries.find(c => 
          c.name.toLowerCase() === countryName.toLowerCase()
        );
        if (countryOption) {
          this.eventForm.patchValue({ country: countryOption.name });
          // Cities will be loaded automatically, wait a bit for them to load
        }
      }

      // Fill city (after country is set and cities are loaded)
      setTimeout(() => {
        const cityName = address.city || address.town || address.municipality || '';
        if (cityName && this.citiesValue.length > 0) {
          const cityOption = this.citiesValue.find(c => 
            c.name.toLowerCase() === cityName.toLowerCase()
          );
          if (cityOption) {
            this.eventForm.patchValue({ city: cityOption });
            // Districts will be loaded automatically via valueChanges subscription
          }
        }

        // Fill district (after city is set and districts are loaded)
        setTimeout(() => {
          const districtName = address.suburb || address.city_district || address.county || '';
          if (districtName && this.districtsWithCities.length > 0) {
            const districtOption = this.districtsWithCities.find(d => 
              d.name.toLowerCase() === districtName.toLowerCase()
            );
            if (districtOption) {
              this.eventForm.patchValue({ districts: districtOption });
              // Wards will be loaded automatically via valueChanges subscription
            }
          }

          // Fill ward (after district is set and wards are loaded)
          setTimeout(() => {
            const wardName = address.neighbourhood || address.quarter || '';
            if (wardName && this.wardsWithDistricts.length > 0) {
              const wardOption = this.wardsWithDistricts.find(w => 
                w.name.toLowerCase() === wardName.toLowerCase()
              );
              if (wardOption) {
                this.eventForm.patchValue({ wards: wardOption });
              }
            }
          }, 500);
        }, 500);
      }, 500);

      // Cache coordinates
      const addressString = geocodeData.display_name || `${lat},${lon}`;
      this.geocodingCache.set(addressString, { lat, lon });

    } catch (error) {
      console.error('Error filling address from geocode:', error);
    }
  }

  /**
   * Fill only coordinates if reverse geocoding fails
   */
  private fillCoordinatesOnly(lat: number, lon: number): void {
    // Cache coordinates for later use
    const addressString = `${lat},${lon}`;
    this.geocodingCache.set(addressString, { lat, lon });
  }

  private async getLanLongFromAddress(address: string): Promise<{ lat: number; lon: number } | null> {
    if (this.geocodingCache.has(address)) {
      const cachedResult = this.geocodingCache.get(address);
      return cachedResult ? cachedResult : null;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastGeocodingRequest;
    if (timeSinceLastRequest < this.GEOCODING_DELAY) {
      const waitTime = this.GEOCODING_DELAY - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}`;

    try {
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 8000); // 8 seconds timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'EventManagementApp/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      this.lastGeocodingRequest = Date.now();

      if (data && data.length > 0) {
        const result = {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon)
        };
        this.geocodingCache.set(address, result);
        return result;
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  private isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        return ['name', 'shortDescription', 'content', 'eventType']
          .every(control => this.eventForm.get(control)?.valid) && !!(this.coverImageFile || this.coverImageUrl);
      case 2:
        return this.dateSlots.valid &&
          ['location', 'details_address', 'country', 'city'].every(control => this.eventForm.get(control)?.valid);
      case 3:
        return !!this.eventForm.get('maxAttendees')?.valid &&
          this.tickets.valid &&
          this.tickets.controls.some(control => control.get('name')?.value);
      case 4:
        return this.eventForm.valid;
      default:
        return true;
    }
  }

  private markStepAsTouched(step: number): void {
    switch (step) {
      case 1:
        ['name', 'shortDescription', 'content'].forEach(control => this.eventForm.get(control)?.markAsTouched());
        break;
      case 2:
        this.dateSlots.controls.forEach(group => group.markAllAsTouched());
        ['location', 'details_address', 'country', 'city', 'districts', 'wards']
          .forEach(control => this.eventForm.get(control)?.markAsTouched());
        break;
      case 3:
        this.eventForm.get('maxAttendees')?.markAsTouched();
        this.tickets.controls.forEach(group => group.markAllAsTouched());
        break;
    }
  }

  private createDateSlotGroup(): FormGroup {
    return this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });
  }

  private createTicketGroup(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      quantity: [0, [Validators.required, Validators.min(0)]],
      saleStartDate: ['']
    });
  }

  /**
   * Fill form with mock data for testing
   */
  fillMockData(): void {
    
    // Calculate dates (1 week from now)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    startDate.setHours(18, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setHours(21, 0, 0, 0);
    
    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatDateTimeLocal = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const defaultCategories = this.getDefaultCategorySlugs(2);

    // Set basic form values
    this.eventForm.patchValue({
      name: 'Tech Innovation Summit 2024',
      shortDescription: 'Explore the latest trends in AI, blockchain, and IoT with industry leaders',
      content: 'A comprehensive conference featuring keynote speakers, panel discussions, and networking sessions on emerging technologies. Join us for an exciting day of learning and networking with industry experts.',
      category: defaultCategories.length ? defaultCategories : ['cong-nghe-ai', 'innovation'],
      tags: 'Technology, Innovation, AI, Blockchain, IoT, Networking',
      eventType: 'offline',
      location: 'Ho Chi Minh City Convention Center',
      details_address: '123 Nguyen Hue Boulevard',
      country: { code: 'VN', name: 'Vietnam' },
      city: { code: 'SG', name: 'Ho Chi Minh City' },
      districts: { code: 'Q1', name: 'District 1' },
      wards: { code: 'W1', name: 'Ward 1' },
      price: 299000,
      displayPrice: 299000,
      maxAttendees: 500
    });

    // Set date slots
    while (this.dateSlots.length > 0) {
      this.dateSlots.removeAt(0);
    }
    const dateSlotGroup = this.fb.group({
      startDate: [formatDateTimeLocal(startDate), Validators.required],
      endDate: [formatDateTimeLocal(endDate), Validators.required]
    });
    this.dateSlots.push(dateSlotGroup);

    // Set tickets
    while (this.tickets.length > 0) {
      this.tickets.removeAt(0);
    }
    
    const ticket1 = this.fb.group({
      name: ['Early Bird', Validators.required],
      price: [199000, [Validators.required, Validators.min(0)]],
      quantity: [100, [Validators.required, Validators.min(0)]],
      saleStartDate: [formatDateTimeLocal(new Date())]
    });
    
    const ticket2 = this.fb.group({
      name: ['Regular', Validators.required],
      price: [299000, [Validators.required, Validators.min(0)]],
      quantity: [300, [Validators.required, Validators.min(0)]],
      saleStartDate: [formatDateTimeLocal(new Date())]
    });
    
    const ticket3 = this.fb.group({
      name: ['VIP', Validators.required],
      price: [499000, [Validators.required, Validators.min(0)]],
      quantity: [50, [Validators.required, Validators.min(0)]],
      saleStartDate: [formatDateTimeLocal(new Date())]
    });
    
    this.tickets.push(ticket1);
    this.tickets.push(ticket2);
    this.tickets.push(ticket3);

    // Set cover image URL (mock)
    this.coverImageUrl = 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg';
    this.coverImageFile = null;
    this.imageError = '';

    // Set gallery images (mock)
    this.galleryImages = [
      'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg',
      'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg'
    ];

    // Update event type state
    this.isOffline = true;
    this.isHybird = false;

    // Mark form as touched to show validation
    this.eventForm.markAllAsTouched();

  }

  /**
   * Create event directly with mock payload (bypass form)
   * Useful for quick testing
   */
  async createMockEvent(): Promise<void> {
    
    this.isLoading = true;
    const nowIso = new Date().toISOString();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    startDate.setHours(18, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(21, 0, 0, 0);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const mockCategories = this.getDefaultCategorySlugs(2);

    const mockEvent: Partial<EventList> = {
      core: {
        id: '',
        name: 'Tech Innovation Summit 2024',
        shortDescription: 'Explore the latest trends in AI, blockchain, and IoT with industry leaders',
        description: 'A comprehensive conference featuring keynote speakers, panel discussions, and networking sessions on emerging technologies.',
        content: 'A comprehensive conference featuring keynote speakers, panel discussions, and networking sessions on emerging technologies. Join us for an exciting day of learning and networking with industry experts.',
        category: mockCategories.length ? mockCategories : ['cong-nghe-ai', 'innovation'],
        tags: ['Technology', 'Innovation', 'AI', 'Blockchain', 'IoT', 'Networking'],
        eventType: 'offline',
        price: 299000
      },
      status: {
        visibility: 'public',
        featured: false,
        state: 'published',
        deletedAt: null
      },
      media: {
        coverImage: 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg',
        primaryImage: 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg',
        gallery: [
          'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg',
          'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg'
        ],
        image_url: 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg'
      },
      schedule: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dateTimeOptions: [{
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          time_zone: timezone
        }],
        timezone
      },
      location: {
        type: 'offline',
        address: '123 Nguyen Hue Boulevard, District 1, Ho Chi Minh City, Vietnam',
        details_address: '123 Nguyen Hue Boulevard',
        city: { name: 'Ho Chi Minh City', code: 'SG' },
        district: { name: 'District 1', code: 'Q1' },
        ward: { name: 'Ward 1', code: 'W1' },
        country: { name: 'Vietnam', code: 'VN' },
        coordinates: {
          lat: 10.7769,
          lng: 106.7009,
          latitude: 10.7769,
          longitude: 106.7009
        }
      },
      organizer: {
        id: String(this.currentUser?.id || '0'),
        name: this.currentUser?.fullName || this.currentUser?.profile?.fullName || 'Event Organizer',
        followers: this.currentUser?.social?.followers ?? 0,
        profileImage: this.currentUser?.profileImage || this.currentUser?.profile?.avatar || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1744575077/default-avatar_br3ffh.png'
      },
      tickets: {
        catalog: [
          {
            id: 'ticket-1',
            name: 'Early Bird',
            price: 199000,
            quantity: 100,
            quantityAvailable: 100,
            type: 'early-bird',
            status: 'active'
          },
          {
            id: 'ticket-2',
            name: 'Regular',
            price: 299000,
            quantity: 300,
            quantityAvailable: 300,
            type: 'regular',
            status: 'active'
          },
          {
            id: 'ticket-3',
            name: 'VIP',
            price: 499000,
            quantity: 50,
            quantityAvailable: 50,
            type: 'vip',
            status: 'active'
          }
        ],
        capacity: 500,
        maxAttendees: 500
      },
      engagement: {
        attendeesCount: 0,
        likesCount: 0,
        viewCount: 0,
        searchTerms: []
      },
      metadata: {
        currency: getDefaultCurrency().code
      },
      timeline: {
        createdAt: nowIso,
        updatedAt: nowIso
      },
      name: 'Tech Innovation Summit 2024',
      description: 'Explore the latest trends in AI, blockchain, and IoT with industry leaders',
      content: 'A comprehensive conference featuring keynote speakers, panel discussions, and networking sessions on emerging technologies.',
      date_time_options: [{
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        time_zone: timezone
      }],
      image_url: 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg',
      price: 299000,
      max_attendees: 500,
      tags: ['Technology', 'Innovation', 'AI', 'Blockchain', 'IoT', 'Networking'],
      event_type: 'offline',
      created_at: nowIso,
      updated_at: nowIso
    };

    this.eventsService.addEvent(mockEvent as EventList).subscribe({
      next: () => {
        this.isLoading = false;
        this.created.emit('Mock event created successfully');
        this.resetFormState();
      },
      error: (err: unknown) => {
        this.isLoading = false;
        const errorMessage = err instanceof Error ? err.message : 'Failed to create mock event';
        this.createError.emit(errorMessage);
      }
    });
  }
}
