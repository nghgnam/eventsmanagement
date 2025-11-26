/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EventList, EventLocation } from '../../core/models/eventstype';
import { AddressInformationService } from '../../core/services/addressInformation.service';
import { CloudinaryService } from '../../core/services/cloudinary.service';
import { EventsService } from '../../core/services/events.service';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="create-event-container">
      <h3>Create New Event</h3>
      <form [formGroup]="eventForm" (ngSubmit)="onSubmit()">
        <!-- Form fields will be added here -->
      </form>
    </div>
  `,
  styles: [`
    .create-event-container {
      padding: 20px;
    }
  `]
})
export class CreateEventComponent implements OnInit {
  private eventsService = inject(EventsService);
  private cloudinaryService = inject(CloudinaryService);
  private fb = inject(FormBuilder);
  private location = inject(AddressInformationService);

  eventForm: FormGroup;
  successMessage: string = '';
  errorMessage: string = '';
  cities: any[] = [];
  districts: any[] = [];
  wards: any[] = [];
  filteredDistricts: any[] = [];
  filteredWards: any[] = [];

  constructor() {
    this.eventForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      content: ['', [Validators.required]],
      start_date: ['', [Validators.required]],
      end_date: ['', [Validators.required]],
      event_type: ['', [Validators.required]],
      address: [''],
      districts: [''],
      wards: [''],
      country: [''],
      city: [''],
      price: [0, [Validators.min(0)]],
      max_attendees: [0, [Validators.min(0)]],
      tags: [[]],
      image: ['']
    });
  }

  ngOnInit() {
    // Load initial data
    this.loadLocationData();

    // Set up form value change listeners
    this.setupFormListeners();
  }

  private loadLocationData() {
    this.location.getCities().subscribe(cities => {
      this.cities = cities as any[];
    });

    this.location.getDistricts().subscribe(districts => {
      this.districts = districts as any[];
    });

    this.location.getWards().subscribe(wards => {
      this.wards = wards as any[];
    });
  }

  private setupFormListeners() {
    // Listen for city changes
    this.eventForm.get('city')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(selectedCity => {
        if (selectedCity && selectedCity.code) {
          this.filteredDistricts = this.districts.filter(
            district => district.parent_code === selectedCity.code
          );
          this.eventForm.get('districts')?.reset();
          this.eventForm.get('wards')?.reset();
          this.filteredWards = [];
        } else {
          this.filteredDistricts = [];
          this.filteredWards = [];
        }
      });

    // Listen for district changes
    this.eventForm.get('districts')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(selectedDistrict => {
        if (selectedDistrict && selectedDistrict.code) {
          this.filteredWards = this.wards.filter(
            ward => ward.parent_code === selectedDistrict.code
          );
          this.eventForm.get('wards')?.reset();
        } else {
          this.filteredWards = [];
        }
      });
  }

  onSubmit() {
    if (this.eventForm.valid) {
      const eventData = this.prepareEventData();
      this.eventsService.addEvent(eventData as EventList).subscribe({
        next: () => {
          this.successMessage = 'Event created successfully';
          this.eventForm.reset();
        },
        error: (error) => {
          console.error('Error creating event:', error);
          this.errorMessage = 'Failed to create event';
        }
      });
    }
  }

  private prepareEventData(): Partial<EventList> {
    const formValue = this.eventForm.value;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tags = Array.isArray(formValue.tags) ? formValue.tags : [];
    const nowIso = new Date().toISOString();
    
    const cityName = typeof formValue.city === 'string' ? formValue.city : formValue.city?.name;
    const districtName = typeof formValue.districts === 'string' ? formValue.districts : formValue.districts?.name;
    const wardName = typeof formValue.wards === 'string' ? formValue.wards : formValue.wards?.name;
    const countryName = typeof formValue.country === 'string' ? formValue.country : formValue.country?.name || formValue.country;

    return {
      core: {
        id: '',
        name: formValue.name,
        shortDescription: formValue.description?.slice(0, 140) ?? '',
        description: formValue.description,
        content: formValue.content,
        category: [],
        tags,
        eventType: formValue.event_type,
        price: formValue.price ?? 0
      },
      status: {
        visibility: 'public',
        featured: false,
        state: 'published',
        deletedAt: null
      },
      media: {
        coverImage: formValue.image || null,
        primaryImage: formValue.image || null,
        gallery: formValue.image ? [formValue.image] : [],
        image_url: formValue.image || ''
      },
      schedule: {
        startDate: formValue.start_date,
        endDate: formValue.end_date,
        dateTimeOptions: [{
          start_time: formValue.start_date,
          end_time: formValue.end_date,
          time_zone: timezone
        }],
        timezone
      },
      location: {
        type: formValue.event_type || 'offline',
        address: formValue.address || '',
        city: cityName ? (typeof formValue.city === 'object' ? formValue.city : { name: cityName }) : null,
        district: districtName ? (typeof formValue.districts === 'object' ? formValue.districts : { name: districtName }) : null,
        ward: wardName ? (typeof formValue.wards === 'object' ? formValue.wards : { name: wardName }) : null,
        country: countryName ? (typeof formValue.country === 'object' && formValue.country.name ? formValue.country : { name: countryName }) : null,
        coordinates: {
          lat: 0,
          lng: 0,
          latitude: 0,
          longitude: 0
        }
      } as EventLocation,
      tickets: {
        catalog: [],
        capacity: formValue.max_attendees ?? null,
        maxAttendees: formValue.max_attendees ?? null
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
        updatedAt: nowIso,
        created_at: nowIso,
        updated_at: nowIso
      },
      // Legacy fields for backward compatibility
      name: formValue.name,
      description: formValue.description,
      content: formValue.content,
      date_time_options: [{
        start_time: formValue.start_date,
        end_time: formValue.end_date,
        time_zone: timezone
      }],
      image_url: formValue.image || '',
      price: formValue.price,
      max_attendees: formValue.max_attendees,
      tags,
      event_type: formValue.event_type,
      created_at: nowIso,
      updated_at: nowIso
    };
  }
} 