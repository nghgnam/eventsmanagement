import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EventList } from '../../types/eventstype';
import { EventsService } from '../../service/events.service';
import { CloudinaryService } from '../../service/cloudinary.service';
import { AddressInformationService } from '../../service/addressInformation.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
  eventForm: FormGroup;
  successMessage: string = '';
  errorMessage: string = '';
  cities: any[] = [];
  districts: any[] = [];
  wards: any[] = [];
  filteredDistricts: any[] = [];
  filteredWards: any[] = [];

  constructor(
    private eventsService: EventsService,
    private cloudinaryService: CloudinaryService,
    private fb: FormBuilder,
    private location: AddressInformationService
  ) {
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
      this.cities = cities;
    });

    this.location.getDistricts().subscribe(districts => {
      this.districts = districts;
    });

    this.location.getWards().subscribe(wards => {
      this.wards = wards;
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
      this.eventsService.addEvent(eventData).subscribe({
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

  private prepareEventData(): EventList {
    const formValue = this.eventForm.value;
    return {
      ...formValue,
      created_at: new Date(),
      updated_at: new Date(),
      status: 'published',
      attendees_count: 0,
      likes_count: 0
    };
  }
} 