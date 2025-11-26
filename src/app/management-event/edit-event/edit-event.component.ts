/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Timestamp, doc, updateDoc } from 'firebase/firestore';
import * as countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, tap } from 'rxjs/operators';
import { auth, db } from '../../config/firebase.config';
import { AddressInformationService } from '../../core/services/addressInformation.service';
import { CloudinaryService } from '../../core/services/cloudinary.service';
import { EventsService } from '../../core/services/events.service';
import { SafeUrlService } from '../../core/services/santizer.service';
import { UsersService } from '../../core/services/users.service';
import { EventList } from '../../core/models/eventstype';

interface CloudinaryResponse {
  secure_url: string;
}

@Component({
  selector: 'app-edit-event',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './edit-event.component.html',
  styleUrls: ['./edit-event.component.css']
})
export class EditEventComponent implements OnInit, OnDestroy {
  private eventsService = inject(EventsService);
  private sanitizer = inject(SafeUrlService);
  private fb = inject(FormBuilder);
  private cloudinary = inject(CloudinaryService);
  private usersService = inject(UsersService);
  router = inject(Router);
  private location = inject(AddressInformationService);

  @Input() eventId: string | undefined;
  @Input() countries: { code: string, name: string}[] = [];
  @Input() citiesValue: any[] = [];
  @Input() districtsValue: any[] = [];
  @Input() wardsValue: any[] = [];
  
  eventForm!: FormGroup;
  successMessage: string = '';
  errorMessage: string = '';
  eventData: EventList | undefined;
  isLoading: boolean = false;
  imagePreviewUrl: string | null = null;
  imageError: string | null = null;
  selectedFile: File | null = null;
  isOffline: boolean = false;
  isHybrid: boolean = false;
  districtsWithCities: any[] = [];
  wardsWithDistricts: any[] = [];

  private currentUserId: string | undefined;
  private destroy$ = new Subject<void>();
  private geocodingCache: Map<string, { lat: number, lon: number }> = new Map();
  private lastGeocodingRequest: number = 0;
  private readonly GEOCODING_DELAY = 1000;

  constructor() {
    countries.registerLocale(en);
    this.initializeForm();
  }

  private initializeForm(): void {
    this.eventForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      content: ['', [Validators.required]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      eventType: ['offline', [Validators.required]],
      details_address: [''],
      districts: [''],
      wards: [''],
      country: [''],
      city: [''],
      price: [0, [Validators.min(0)]],
      maxAttendees: [1, [Validators.min(1)]],
      tags: [''],
      image: ['']
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

  private checkUserAndLoadEvent(): void {
    if (!this.currentUserId) {
      this.errorMessage = 'User not authenticated';
      return;
    }

    this.usersService.getCurrentUserById(this.currentUserId).pipe(
      takeUntil(this.destroy$),
      tap(data => {
        const userType = data?.type ?? data?.account?.type;
        if (userType !== 'organizer') {
          this.errorMessage = 'Only organizers can edit events';
        } else {
          const userName = data?.fullName ?? data?.profile?.fullName ?? data?.account?.username ?? 'Organizer';
          this.successMessage = `Welcome Organizer ${userName}`;
          this.loadEventData();
        }
      })
    ).subscribe();
  }

  private loadEventData(): void {
    if (!this.eventId) {
      console.error('No event ID provided');
      return;
    }

    console.log('Loading event data for ID:', this.eventId);
    this.eventsService.getEventById(this.eventId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (event) => {
        console.log('Event data loaded:', event);
        if (event) {
          this.eventData = event;
          this.updateFormWithEventData(event);
        } else {
          this.errorMessage = 'Event not found';
        }
      },
      error: (error) => {
        console.error('Error loading event:', error);
        this.errorMessage = 'Error loading event data';
      }
    });
  }

  private updateFormWithEventData(event: EventList): void {
    if (!event) {
      console.error('No event data to update form');
      return;
    }

    console.log('Updating form with event data:', event);

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

    console.log('Found location data:', { city, district, ward });

    // Update districts and wards based on selected city
    if (city) {
      this.districtsWithCities = this.districtsValue.filter(
        d => d.parent_code === city.code
      );
      console.log('Updated districts for city:', this.districtsWithCities);
    }

    if (district) {
      this.wardsWithDistricts = this.wardsValue.filter(
        w => w.parent_code === district.code
      );
      console.log('Updated wards for district:', this.wardsWithDistricts);
    }

    const formData = {
      name: eventName,
      description: eventDescription,
      content: eventContent,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      eventType: eventType,
      details_address: event.location?.address || '',
      districts: district || '',
      wards: ward || '',
      country: countryName || '',
      city: city || '',
      price: eventPrice,
      maxAttendees: maxAttendees,
      tags: eventTags.join(', '),
      image: imageUrl
    };

    console.log('Setting form data:', formData);
    this.eventForm.patchValue(formData);

    if (imageUrl) {
      this.imagePreviewUrl = imageUrl;
    }

    this.updateEventTypeState(eventType);
  }

  private updateEventTypeState(type: string): void {
    this.isOffline = type === 'offline';
    this.isHybrid = type === 'hybrid';
    
    const locationControls = ['details_address', 'districts', 'wards', 'country', 'city'];
    locationControls.forEach(control => {
      if (this.isOffline || this.isHybrid) {
        this.eventForm.get(control)?.setValidators([Validators.required]);
      } else {
        this.eventForm.get(control)?.clearValidators();
      }
      this.eventForm.get(control)?.updateValueAndValidity();
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (!this.validateImage(file)) return;

    this.selectedFile = file;
    this.imageError = null;
    this.createImagePreview(file);
  }

  private validateImage(file: File): boolean {
    if (!file.type.startsWith('image/')) {
      this.imageError = 'Please select a valid image file';
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.imageError = 'Image size should not exceed 5MB';
      return false;
    }

    return true;
  }

  private createImagePreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreviewUrl = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.imagePreviewUrl = null;
    this.selectedFile = null;
    this.eventForm.patchValue({ image: '' });
  }

  triggerImageUpload(): void {
    document.getElementById('image')?.click();
  }

  async onSubmit(): Promise<void> {
    if (this.eventForm.invalid || this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // let imageUrl = this.eventForm.get('image')?.value;
      // if (this.selectedFile) {
      //   imageUrl = await this.uploadImage();
      // }

      const eventData = this.prepareEventData();
      await this.updateEvent(eventData);

      this.successMessage = 'Event updated successfully';
      setTimeout(() => {
        this.router.navigate(['/events']);
      }, 2000);
    } catch (error) {
      this.errorMessage = 'Error updating event';
      console.error('Error updating event:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async uploadImage(): Promise<string> {
    if (!this.selectedFile) throw new Error('No image selected');
    return new Promise((resolve, reject) => {
      this.cloudinary.upLoadImage(this.selectedFile!).subscribe({
        next: (response: unknown) => {
          const responseData = response as CloudinaryResponse;
          resolve(responseData.secure_url);
        },
        error: (error) => reject(error)
      });
    });
  }

  private prepareEventData(): Partial<EventList> {
    const formData = this.eventForm.value;
    const addressDetails = formData.details_address || '';
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tags = formData.tags
      ? formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => !!tag)
      : [];
    
    const cityName = typeof formData.city === 'string' ? formData.city : formData.city?.name;
    const districtName = typeof formData.districts === 'string' ? formData.districts : formData.districts?.name;
    const wardName = typeof formData.wards === 'string' ? formData.wards : formData.wards?.name;
    const countryName = typeof formData.country === 'string' ? formData.country : formData.country?.name || formData.country;

    const existingCoordinates = this.eventData?.location?.coordinates || { lat: 0, lng: 0, latitude: 0, longitude: 0 };
    const coordinates = {
      lat: existingCoordinates.lat ?? existingCoordinates.latitude ?? 0,
      lng: existingCoordinates.lng ?? existingCoordinates.longitude ?? 0,
      latitude: existingCoordinates.latitude ?? existingCoordinates.lat ?? 0,
      longitude: existingCoordinates.longitude ?? existingCoordinates.lng ?? 0
    };

    const existingStatus = this.eventData?.status;
    const statusState = typeof existingStatus === 'string' ? existingStatus : existingStatus?.state ?? 'published';

    return {
      core: {
        id: this.eventData?.id ?? '',
        name: formData.name,
        shortDescription: formData.description?.slice(0, 140) ?? '',
        description: formData.description,
        content: formData.content,
        category: this.eventData?.core?.category ?? [],
        tags,
        eventType: formData.eventType,
        price: formData.price ?? 0
      },
      status: {
        visibility: typeof existingStatus === 'object' ? (existingStatus.visibility ?? 'public') : 'public',
        featured: typeof existingStatus === 'object' ? (existingStatus.featured ?? false) : false,
        state: statusState,
        deletedAt: typeof existingStatus === 'object' ? existingStatus.deletedAt : null
      },
      media: {
        coverImage: this.imagePreviewUrl || this.eventData?.media?.coverImage || this.eventData?.image_url || '',
        primaryImage: this.imagePreviewUrl || this.eventData?.media?.primaryImage || this.eventData?.image_url || '',
        gallery: this.imagePreviewUrl ? [this.imagePreviewUrl] : (this.eventData?.media?.gallery ?? []),
        image_url: this.imagePreviewUrl || this.eventData?.image_url || ''
      },
      schedule: {
        startDate: formData.startDate,
        endDate: formData.endDate,
        dateTimeOptions: [{
          start_time: formData.startDate,
          end_time: formData.endDate,
          time_zone: timezone
        }],
        timezone
      },
      location: {
        type: formData.eventType,
        address: addressDetails,
        city: cityName ? (typeof formData.city === 'object' ? formData.city : { name: cityName }) : null,
        district: districtName ? (typeof formData.districts === 'object' ? formData.districts : { name: districtName }) : null,
        ward: wardName ? (typeof formData.wards === 'object' ? formData.wards : { name: wardName }) : null,
        country: countryName ? (typeof formData.country === 'object' && formData.country.name ? formData.country : { name: countryName }) : null,
        coordinates
      },
      organizer: this.eventData?.organizer || {
        id: '',
        name: '',
        followers: 0
      },
      tickets: {
        catalog: this.eventData?.tickets?.catalog ?? [],
        capacity: formData.maxAttendees ?? null,
        maxAttendees: formData.maxAttendees ?? null
      },
      engagement: this.eventData?.engagement ?? {
        attendeesCount: 0,
        likesCount: 0,
        viewCount: 0,
        searchTerms: []
      },
      metadata: this.eventData?.metadata ?? {},
      timeline: {
        createdAt: this.eventData?.timeline?.createdAt ?? this.eventData?.created_at ?? Timestamp.now(),
        updatedAt: Timestamp.now(),
        created_at: this.eventData?.created_at ?? Timestamp.now(),
        updated_at: Timestamp.now()
      },
      // Legacy fields for backward compatibility
      name: formData.name,
      description: formData.description,
      content: formData.content,
      date_time_options: [{
        start_time: formData.startDate,
        end_time: formData.endDate,
        time_zone: timezone
      }],
      image_url: this.imagePreviewUrl || this.eventData?.image_url || '',
      price: formData.price,
      max_attendees: formData.maxAttendees,
      tags,
      event_type: formData.eventType,
      created_at: this.eventData?.created_at ?? Timestamp.now(),
      updated_at: Timestamp.now()
    };
  }

  private async updateEvent(eventData: Partial<EventList>): Promise<void> {
    if (!this.eventId) throw new Error('Event ID is required');
    const eventDocRef = doc(db, 'events', this.eventId);
    await updateDoc(eventDocRef, eventData);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}


