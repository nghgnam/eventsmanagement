/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnDestroy, OnInit, OnChanges, SimpleChanges, inject, PLATFORM_ID } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Timestamp, doc, updateDoc } from 'firebase/firestore';
import * as countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, tap } from 'rxjs/operators';
import { auth, db } from '../../../../core/config/firebase.config';
import { AddressInformationService } from '../../../../core/services/addressInformation.service';
import { CloudinaryService } from '../../../../core/services/cloudinary.service';
import { EventsService } from '../../../../core/services/events.service';
import { SafeUrlService } from '../../../../core/services/santizer.service';
import { UsersService } from '../../../../core/services/users.service';
import { EventList } from '../../../../core/models/eventstype';
import { CURRENCIES, Currency, getDefaultCurrency } from '../../../../core/models/currencies';
import { NgSelectModule } from '@ng-select/ng-select';
import { User } from '../../../../core/models/userstype';
import * as countriesLib from 'i18n-iso-countries';

interface CloudinaryResponse {
  secure_url: string;
}

@Component({
  selector: 'app-edit-event',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgSelectModule],
  templateUrl: './edit-event.component.html',
  styleUrls: ['../manage-events/manage-events.component.css', './edit-event.component.css']
})
export class EditEventComponent implements OnInit, OnChanges, OnDestroy {
  private eventsService = inject(EventsService);
  private sanitizer = inject(SafeUrlService);
  private fb = inject(FormBuilder);
  private cloudinary = inject(CloudinaryService);
  private usersService = inject(UsersService);
  router = inject(Router);
  private location = inject(AddressInformationService);
  private platformId = inject(PLATFORM_ID);

  @Input() eventId: string | undefined;
  @Input() currentUser: User | undefined;
  @Output() cancelled = new EventEmitter<void>();
  @Output() updated = new EventEmitter<string>();
  @Output() updateError = new EventEmitter<string>();
  
  eventForm!: FormGroup;
  successMessage: string = '';
  errorMessage: string = '';
  eventData: EventList | undefined;
  isLoading: boolean = false;
  imagePreviewUrl: string | null = null;
  imageError: string | null = null;
  selectedFile: File | null = null;
  isOffline: boolean = false;
  isHybird: boolean = false;
  districtsWithCities: any[] = [];
  wardsWithDistricts: any[] = [];
  availableCategories: string[] = ['Automotive', 'Technology', 'Health', 'Education', 'Sports', 'Entertainment', 'Finance'];
  wizardSteps: string[] = ['General Info & Media', 'Time & Location', 'Tickets & Capacity', 'Review & Submit'];
  currentStep = 1;
  readonly maxSteps = 4;
  coverImageFile: File | null = null;
  coverImageUrl: string | null = null;
  galleryImages: string[] = [];
  isUploadingGallery = false;
  countries: { code: string; name: string }[] = [];
  citiesValue: any[] = [];
  districtsValue: any[] = [];
  wardsValue: any[] = [];
  currencies: (Currency & { displayText: string })[] = CURRENCIES.map(c => ({
    ...c,
    displayText: `${c.flag || ''} ${c.code} - ${c.symbol} ${c.name}`
  }));

  private currentUserId: string | undefined;
  private destroy$ = new Subject<void>();
  private geocodingCache: Map<string, { lat: number, lon: number }> = new Map();
  private lastGeocodingRequest: number = 0;
  private readonly GEOCODING_DELAY = 1000;
  private locationSubscriptions: Subscription[] = [];
  private formSubscriptions: Subscription[] = [];
  private canLoadEventData = false;

  constructor() {
    countriesLib.registerLocale(en);
    this.countries = this.getCountryList();
    this.initializeForm();
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

  handleCancel(): void {
    this.cancelled.emit();
  }

  goToStep(step: number): void {
    if (step < 1 || step > this.maxSteps || step === this.currentStep) {
      return;
    }
    this.currentStep = step;
  }

  nextStep(): void {
    if (this.currentStep >= this.maxSteps) {
      return;
    }
    if (this.isStepValid(this.currentStep)) {
      this.currentStep += 1;
    } else {
      this.markStepAsTouched(this.currentStep);
      this.updateError.emit('Please complete the required fields before continuing.');
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

  private initializeForm(): void {
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

    // Setup event type listener
    this.eventForm.get('eventType')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(type => {
      this.updateEventTypeState(type);
    });

    // Setup city change listener
    this.eventForm.get('city')?.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(selectedCity => {
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

    // Setup district change listener
    this.eventForm.get('districts')?.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(selectedDistrict => {
      if (selectedDistrict && selectedDistrict.code) {
        this.wardsWithDistricts = this.wardsValue.filter(
          ward => ward.parent_code === selectedDistrict.code
        );
        this.eventForm.get('wards')?.reset();
      } else {
        this.wardsWithDistricts = [];
      }
    });
  }

  ngOnInit(): void {
    this.currentUserId = auth.currentUser?.uid;
    this.checkUserAndLoadEvent();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId']) {
      this.tryLoadEventData();
    }
  }

  private checkUserAndLoadEvent(): void {
    if (!this.currentUserId) {
      this.errorMessage = 'User not authenticated';
      return;
    }

    this.usersService.getCurrentUserById(this.currentUserId).pipe(
      takeUntil(this.destroy$),
      tap(data => {
        const userName = data?.fullName ?? data?.profile?.fullName ?? data?.account?.username ?? 'Organizer';
        this.successMessage = `Welcome ${userName}`;
        this.canLoadEventData = true;
        this.tryLoadEventData();
      })
    ).subscribe();
  }

  private tryLoadEventData(): void {
    if (!this.canLoadEventData || !this.eventId) {
      return;
    }
    this.loadEventData();
  }

  private loadEventData(): void {
    if (!this.eventId) {
      return;
    }
    this.isLoading = true;
    this.eventsService.getEventById(this.eventId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (event: EventList | undefined) => {
        if (event) {
          this.eventData = event;
          this.updateFormWithEventData(event);
          this.isLoading = false;
        } else {
          this.errorMessage = 'Event not found';
          this.isLoading = false;
        }
      },
      error: (error: unknown) => {
        this.errorMessage = 'Error loading event data';
        if (isPlatformBrowser(this.platformId)) {
          console.error('[EditEvent] Failed to load event', error);
        }
        this.isLoading = false;
      }
    });
  }

  private updateFormWithEventData(event: EventList): void {
    if (!event) {
      return;
    }

    // Get event data from nested structure or legacy fields
    const eventName = event.core?.name ?? event.name ?? '';
    const eventDescription = event.core?.description ?? event.description ?? '';
    const eventContent = event.core?.content ?? event.content ?? '';
    const eventPrice = event.core?.price ?? event.price ?? 0;
    const eventType = event.core?.eventType ?? event.event_type ?? 'offline';
    const eventTags = event.core?.tags ?? event.tags ?? [];
    const maxAttendees = event.tickets?.maxAttendees ?? event.max_attendees ?? 1;
    const imageUrl = event.media?.coverImage ?? event.media?.primaryImage ?? event.image_url ?? '';

    // Get date from nested schedule or legacy date_time_options
    const dateTimeOptions = event.date_time_options || event.schedule?.dateTimeOptions || [];
    const firstOption = (dateTimeOptions[0] || {}) as Record<string, unknown>;
    const startTime = (firstOption['start_time'] || firstOption['startDate'] || event.schedule?.startDate || '') as string;
    const endTime = (firstOption['end_time'] || firstOption['endDate'] || event.schedule?.endDate || '') as string;

    // Convert dates to local datetime-local format
    const startDate = startTime ? new Date(startTime) : new Date();
    const endDate = endTime ? new Date(endTime) : new Date();
    
    const formattedStartDate = startDate.toISOString().slice(0, 16);
    const formattedEndDate = endDate.toISOString().slice(0, 16);

    // Find matching city, district and ward objects
    const locationCity = event.location?.city;
    const locationDistrict = event.location?.district ?? event.location?.districts;
    const locationWard = event.location?.ward ?? event.location?.wards;
    const locationCountry = event.location?.country;

    const cityName = typeof locationCity === 'string' ? locationCity : locationCity?.name;
    const districtName = typeof locationDistrict === 'string' ? locationDistrict : locationDistrict?.name;
    const wardName = typeof locationWard === 'string' ? locationWard : locationWard?.name;
    const countryName = typeof locationCountry === 'string' ? locationCountry : locationCountry?.name;

    const city = this.citiesValue.find(c => c.name === cityName);
    const district = this.districtsValue.find(d => d.name === districtName);
    const ward = this.wardsValue.find(w => w.name === wardName);

    // Update districts and wards based on selected city
    if (city) {
      this.districtsWithCities = this.districtsValue.filter(
        d => d.parent_code === city.code
      );
    }

    if (district) {
      this.wardsWithDistricts = this.wardsValue.filter(
        w => w.parent_code === district.code
      );
    }

    // Clear existing dateSlots and tickets
    while (this.dateSlots.length > 0) {
      this.dateSlots.removeAt(0);
    }
    while (this.tickets.length > 0) {
      this.tickets.removeAt(0);
    }

    // Populate dateSlots
    if (dateTimeOptions.length > 0) {
      dateTimeOptions.forEach((option: any) => {
        const slotStart = option.start_time || option.startDate || '';
        const slotEnd = option.end_time || option.endDate || '';
        if (slotStart && slotEnd) {
          const start = new Date(slotStart);
          const end = new Date(slotEnd);
          this.dateSlots.push(this.fb.group({
            startDate: [start.toISOString().slice(0, 16), Validators.required],
            endDate: [end.toISOString().slice(0, 16), Validators.required]
          }));
        }
      });
    } else {
      // Add default slot if none exist
      this.dateSlots.push(this.fb.group({
        startDate: [formattedStartDate, Validators.required],
        endDate: [formattedEndDate, Validators.required]
      }));
    }

    // Populate tickets
    const ticketsCatalog = event.tickets?.catalog || [];
    if (ticketsCatalog.length > 0) {
      ticketsCatalog.forEach((ticket: any) => {
        this.tickets.push(this.fb.group({
          name: [ticket.name || '', Validators.required],
          price: [ticket.price || 0, [Validators.required, Validators.min(0)]],
          quantity: [ticket.quantity || ticket.quantityAvailable || 0, [Validators.required, Validators.min(0)]],
          saleStartDate: [ticket.saleStartDate || '']
        }));
      });
    } else {
      // Add default ticket if none exist
      this.tickets.push(this.fb.group({
        name: ['', Validators.required],
        price: [eventPrice || 0, [Validators.required, Validators.min(0)]],
        quantity: [0, [Validators.required, Validators.min(0)]],
        saleStartDate: ['']
      }));
    }

    // Get currency
    const currency = event.metadata?.['currency'] || getDefaultCurrency().code;

    // Get categories
    const categories = event.core?.category || [];

    const formData = {
      name: eventName,
      shortDescription: eventDescription,
      content: eventContent,
      eventType: eventType,
      location: event.location?.address || '',
      details_address: event.location?.details_address || event.location?.address || '',
      districts: district || null,
      wards: ward || null,
      country: countryName || '',
      city: city || null,
      price: eventPrice,
      displayPrice: eventPrice,
      maxAttendees: maxAttendees,
      currency: currency,
      category: categories,
      tags: Array.isArray(eventTags) ? eventTags.join(', ') : eventTags
    };

    this.eventForm.patchValue(formData);

    if (imageUrl) {
      this.coverImageUrl = imageUrl;
      if (isPlatformBrowser(this.platformId)) {
        this.imagePreviewUrl = imageUrl;
      }
    }

    // Set gallery images
    if (event.media?.gallery && Array.isArray(event.media.gallery)) {
      this.galleryImages = event.media.gallery;
    }

    this.updateEventTypeState(eventType);
  }

  private updateEventTypeState(type: string): void {
    this.isOffline = type === 'offline';
    this.isHybird = type === 'hybrid';
    
    const locationControls = ['details_address', 'districts', 'wards', 'country', 'city'];
    locationControls.forEach(control => {
      if (this.isOffline || this.isHybird) {
        this.eventForm.get(control)?.setValidators([Validators.required]);
      } else {
        this.eventForm.get(control)?.clearValidators();
      }
      this.eventForm.get(control)?.updateValueAndValidity();
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
      this.updateError.emit('Failed to upload some gallery images');
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

  private async uploadImage(file: File): Promise<string | null> {
    if (!file) {
      return null;
    }

    try {
      return await new Promise((resolve, reject) => {
        this.cloudinary.upLoadImage(file).subscribe({
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

  async onSubmit(): Promise<void> {
    if (this.currentStep !== this.maxSteps) {
      this.nextStep();
      return;
    }

    if (!this.eventForm.valid) {
      this.eventForm.markAllAsTouched();
      this.updateError.emit('Please fill in all required fields correctly');
      return;
    }

    this.isLoading = true;
    const formData = this.eventForm.value;

    if (this.coverImageFile && !this.coverImageUrl) {
      const uploadedCover = await this.uploadImage(this.coverImageFile);
      if (!uploadedCover) {
        this.isLoading = false;
        this.updateError.emit('Failed to upload cover image. Please try again.');
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
      const geocodingPromise = this.getLanLongFromAddress(addressDetails);
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          resolve(null);
        }, 10000);
      });
      
      locationCoords = await Promise.race([geocodingPromise, timeoutPromise]);
      
      if (!locationCoords) {
        locationCoords = {
          lat: 10.7769,
          lon: 106.7009
        };
      }
    } catch (error) {
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

    try {
      const eventData = this.prepareEventData(formData, addressDetails, lat, lon, timezone, tags, nowIso, dateSlots, ticketsCatalog, displayPrice);
      await this.updateEvent(eventData);

      this.successMessage = 'Event updated successfully';
      this.updated.emit('Event updated successfully');
    } catch (error) {
      this.errorMessage = 'Error updating event';
      const errorMsg = error instanceof Error ? error.message : 'Error updating event';
      this.updateError.emit(errorMsg);
    } finally {
      this.isLoading = false;
    }
  }

  private getLocationName(value: unknown): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    if (typeof value === 'object' && value !== null && 'name' in value) {
      return (value as { name?: string }).name?.trim() || '';
    }
    return '';
  }

  private prepareEventData(
    formData: any,
    addressDetails: string,
    lat: number,
    lon: number,
    timezone: string,
    tags: string[],
    nowIso: string,
    dateSlots: any[],
    ticketsCatalog: any[],
    displayPrice: number
  ): Partial<EventList> {
    const cityControlValue = this.eventForm.get('city')?.value;
    const districtsControlValue = this.eventForm.get('districts')?.value;
    const wardsControlValue = this.eventForm.get('wards')?.value;
    const countryControlValue = this.eventForm.get('country')?.value;

    const existingStatus = this.eventData?.status;
    const statusState = typeof existingStatus === 'string' ? existingStatus : existingStatus?.state ?? 'published';

    return {
      core: {
        id: this.eventData?.core?.id ?? this.eventData?.id ?? '',
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
        visibility: typeof existingStatus === 'object' ? (existingStatus.visibility ?? 'public') : 'public',
        featured: typeof existingStatus === 'object' ? (existingStatus.featured ?? false) : false,
        state: statusState,
        deletedAt: typeof existingStatus === 'object' ? existingStatus.deletedAt : null
      },
      media: {
        coverImage: this.coverImageUrl || this.eventData?.media?.coverImage || this.eventData?.image_url || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg',
        primaryImage: this.coverImageUrl || this.eventData?.media?.primaryImage || this.eventData?.image_url || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg',
        gallery: this.galleryImages.length > 0 ? this.galleryImages : (this.eventData?.media?.gallery ?? []),
        image_url: this.coverImageUrl || this.eventData?.image_url || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg'
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
      organizer: this.eventData?.organizer || {
        id: '',
        name: '',
        followers: 0,
        profileImage: ''
      },
      tickets: {
        catalog: ticketsCatalog,
        capacity: formData.maxAttendees ?? null,
        maxAttendees: formData.maxAttendees ?? null
      },
      engagement: this.eventData?.engagement ?? {
        attendeesCount: 0,
        likesCount: 0,
        viewCount: 0,
        searchTerms: []
      },
      metadata: {
        currency: formData.currency || 'VND'
      },
      timeline: {
        createdAt: this.eventData?.timeline?.createdAt ?? this.eventData?.created_at ?? nowIso,
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
      image_url: this.coverImageUrl || this.eventData?.image_url || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg',
      price: displayPrice,
      max_attendees: formData.maxAttendees,
      tags,
      event_type: formData.eventType,
      created_at: this.eventData?.created_at ?? nowIso,
      updated_at: nowIso
    };
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

  async getCurrentLocation(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      this.updateError.emit('Geolocation is not available');
      return;
    }

    if (!navigator.geolocation) {
      this.updateError.emit('Geolocation is not supported by your browser');
      return;
    }

    this.isLoading = true;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Geolocation request timeout'));
        }, 10000);

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

      const address = await this.reverseGeocode(lat, lon);
      
      if (address) {
        this.fillAddressFromGeocode(address, lat, lon);
      } else {
        this.fillCoordinatesOnly(lat, lon);
      }

      this.isLoading = false;
    } catch (error) {
      this.isLoading = false;
      const errorMessage = error instanceof Error ? error.message : 'Failed to get current location';
      this.updateError.emit(`Location error: ${errorMessage}`);
    }
  }

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

  private fillAddressFromGeocode(geocodeData: any, lat: number, lon: number): void {
    try {
      const address = geocodeData.address || {};
      
      const road = address.road || '';
      const houseNumber = address.house_number || '';
      const detailedAddress = houseNumber ? `${houseNumber} ${road}`.trim() : road;
      if (detailedAddress) {
        this.eventForm.patchValue({ details_address: detailedAddress });
      }

      const countryName = address.country || '';
      if (countryName) {
        const countryOption = this.countries.find(c => 
          c.name.toLowerCase() === countryName.toLowerCase()
        );
        if (countryOption) {
          this.eventForm.patchValue({ country: countryOption.name });
        }
      }

      setTimeout(() => {
        const cityName = address.city || address.town || address.municipality || '';
        if (cityName && this.citiesValue.length > 0) {
          const cityOption = this.citiesValue.find(c => 
            c.name.toLowerCase() === cityName.toLowerCase()
          );
          if (cityOption) {
            this.eventForm.patchValue({ city: cityOption });
          }
        }

        setTimeout(() => {
          const districtName = address.suburb || address.city_district || address.county || '';
          if (districtName && this.districtsWithCities.length > 0) {
            const districtOption = this.districtsWithCities.find(d => 
              d.name.toLowerCase() === districtName.toLowerCase()
            );
            if (districtOption) {
              this.eventForm.patchValue({ districts: districtOption });
            }
          }

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

      const addressString = geocodeData.display_name || `${lat},${lon}`;
      this.geocodingCache.set(addressString, { lat, lon });
    } catch (error) {
      console.error('Error filling address from geocode:', error);
    }
  }

  private fillCoordinatesOnly(lat: number, lon: number): void {
    const addressString = `${lat},${lon}`;
    this.geocodingCache.set(addressString, { lat, lon });
  }

  private async updateEvent(eventData: Partial<EventList>): Promise<void> {
    if (!this.eventId) throw new Error('Event ID is required');
    const eventDocRef = doc(db, 'events', this.eventId);
    await updateDoc(eventDocRef, eventData);
  }

  ngOnDestroy(): void {
    this.locationSubscriptions.forEach(sub => sub.unsubscribe());
    this.locationSubscriptions = [];
    this.formSubscriptions.forEach(sub => sub.unsubscribe());
    this.formSubscriptions = [];
    this.resetImagePreview();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private resetImagePreview(): void {
    if (this.imagePreviewUrl && isPlatformBrowser(this.platformId)) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
    this.imagePreviewUrl = null;
  }
}


