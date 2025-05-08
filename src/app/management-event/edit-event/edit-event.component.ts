import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { auth } from '../../config/firebase.config';
import { EventList } from '../../types/eventstype';
import { SafeUrlService } from '../../service/santizer.service';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CloudinaryService } from '../../service/cloudinary.service';
import * as countries from 'i18n-iso-countries';
import { EventsService } from '../../service/events.service';
import en from 'i18n-iso-countries/langs/en.json';
import { UsersService } from '../../service/users.service';
import { Observable, Subject } from 'rxjs';
import { tap, takeUntil, finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Timestamp } from 'firebase/firestore';
import { Router } from '@angular/router';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase.config';
import { AddressInformationService } from '../../service/addressInformation.service';

@Component({
  selector: 'app-edit-event',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './edit-event.component.html',
  styleUrls: ['./edit-event.component.css']
})
export class EditEventComponent implements OnInit, OnDestroy {
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

  constructor(
    private eventsService: EventsService,
    private sanitizer: SafeUrlService,
    private fb: FormBuilder,
    private cloudinary: CloudinaryService,
    private usersService: UsersService,
    public router: Router,
    private location: AddressInformationService
  ) {
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
        if (data?.type !== 'organizer') {
          this.errorMessage = 'Only organizers can edit events';
        } else {
          this.successMessage = `Welcome Organizer ${data.fullName}`;
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

    // Convert dates to local datetime-local format
    const startDate = new Date(event.date_time_options[0]?.start_time || '');
    const endDate = new Date(event.date_time_options[0]?.end_time || '');
    
    const formattedStartDate = startDate.toISOString().slice(0, 16);
    const formattedEndDate = endDate.toISOString().slice(0, 16);

    // Find matching city, district and ward objects
    const city = this.citiesValue.find(c => c.name === event.location?.city?.name);
    const district = this.districtsValue.find(d => d.name === event.location?.districts?.name);
    const ward = this.wardsValue.find(w => w.name === event.location?.wards?.name);

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
      name: event.name || '',
      description: event.description || '',
      content: event.content || '',
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      eventType: event.event_type || 'offline',
      details_address: event.location?.address || '',
      districts: district || '',
      wards: ward || '',
      country: event.location?.country || '',
      city: city || '',
      price: event.price || 0,
      maxAttendees: event.max_attendees || 1,
      tags: event.tags?.join(', ') || '',
      image: event.image_url || ''
    };

    console.log('Setting form data:', formData);
    this.eventForm.patchValue(formData);

    if (event.image_url) {
      this.imagePreviewUrl = event.image_url;
    }

    this.updateEventTypeState(event.event_type);
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
      let imageUrl = this.eventForm.get('image')?.value;

      if (this.selectedFile) {
        imageUrl = await this.uploadImage();
      }

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
        next: (response) => resolve(response.secure_url),
        error: (error) => reject(error)
      });
    });
  }

  private prepareEventData(): Partial<EventList> {
    const formData = this.eventForm.value;
    const addressDetails = formData.details_address || '';

    return {
      name: formData.name,
      description: formData.description,
      content: formData.content,
      date_time_options: [{
        start_time: formData.startDate,
        end_time: formData.endDate,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }],
      location: {
        type: formData.eventType,
        address: addressDetails,
        districts: formData.districts,
        wards: formData.wards,
        country: formData.country,
        city: formData.city,
        coordinates: this.eventData?.location?.coordinates || {
          latitude: 0,
          longitude: 0
        }
      },
      image_url: this.imagePreviewUrl || this.eventData?.image_url || '',
      price: formData.price,
      max_attendees: formData.maxAttendees,
      tags: formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag),
      event_type: formData.eventType,
      organizer: this.eventData?.organizer || {
        id: '',
        name: '',
        followers: 0
      },
      status: this.eventData?.status || 'published',
      created_at: this.eventData?.created_at || Timestamp.now(),
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


