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

interface CloudinaryResponse {
  secure_url: string;
}

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
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
  availableCategories: string[] = ['Automotive', 'Technology', 'Health', 'Education', 'Sports', 'Entertainment', 'Finance'];
  wizardSteps: string[] = ['General Info & Media', 'Time & Location', 'Tickets & Capacity', 'Review & Submit'];
  currentStep = 1;
  readonly maxSteps = 4;

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

  toggleCategory(category: string): void {
    const categories = new Set(this.eventForm.value.category || []);
    if (categories.has(category)) {
      categories.delete(category);
    } else {
      categories.add(category);
    }
    this.eventForm.patchValue({ category: Array.from(categories) });
  }
  isCategorySelected(category: string): boolean {
    return (this.eventForm.value.category || []).includes(category);
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
    const locationCoords = await this.getLanLongFromAddress(addressDetails);

    if (!locationCoords) {
      this.isLoading = false;
      this.createError.emit('Không tìm thấy vị trí từ địa chỉ.');
      return;
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
        currency: 'VND'
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

    this.eventsService.addEvent(newEvent as EventList).subscribe({
      next: () => {
        this.isLoading = false;
        this.created.emit('Event created successfully');
        this.resetFormState();
      },
      error: (err: unknown) => {
        console.error('Error creating event:', err);
        this.isLoading = false;
        this.createError.emit('Failed to create event');
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
      console.error('Error uploading gallery images:', err);
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
      console.error('Error getting country list:', err);
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
      console.error('Error uploading image:', err);
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

  private async getLanLongFromAddress(address: string): Promise<{ lat: number; lon: number } | null> {
    if (this.geocodingCache.has(address)) {
      const cachedResult = this.geocodingCache.get(address);
      return cachedResult ? cachedResult : null;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastGeocodingRequest;
    if (timeSinceLastRequest < this.GEOCODING_DELAY) {
      await new Promise(resolve => setTimeout(resolve, this.GEOCODING_DELAY - timeSinceLastRequest));
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}`;

    try {
      const response = await fetch(url);
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
      console.error('Geocoding error:', err);
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
}
