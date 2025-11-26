/* eslint-disable @typescript-eslint/no-explicit-any */

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import { getAuth } from 'firebase/auth';
import * as countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import { from } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AddressInformationService } from '../../core/services/addressInformation.service';
import { AuthService } from '../../core/services/auth.service';
import { CloudinaryService } from '../../core/services/cloudinary.service';
import { EventsService } from '../../core/services/events.service';
import { UsersService } from '../../core/services/users.service';
import { EventList } from '../../core/models/eventstype';
import { User } from '../../core/models/userstype';
import { CreateEventComponent } from '../create-event/create-event.component';
import { EditEventComponent } from '../edit-event/edit-event.component';
import { TrashEventsComponent } from '../trash-events/trash-events.component';

interface CloudinaryResponse {
  secure_url: string;
}

@Component({
  selector: 'app-manage-events',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, ReactiveFormsModule, TrashEventsComponent, EditEventComponent, CreateEventComponent],
  templateUrl: './manage-events.component.html',
  styleUrls: ['./manage-events.component.css']
})
export class ManageEventsComponent implements OnInit {
  private usersService = inject(UsersService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private eventService = inject(EventsService);
  private cloudinaryService = inject(CloudinaryService);
  private fb = inject(FormBuilder);
  private location = inject(AddressInformationService);
  private authService = inject(AuthService);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  editEventid: string | undefined
  currentUser: User | undefined;
  currentOrganizerEvent: EventList[] = [];
  errorMessage: string = '';
  successMessage: string = '';
  showCreateEventForm: boolean = false;
  eventForm: FormGroup;
  activeTab: 'upcoming' | 'past' | 'edit' | 'delete' | 'create' |undefined = 'upcoming'; 
  isLoading: boolean = false;
  selectedImage: File | null = null;
  imageError: string = '';
  imagePreviewUrl: string | null = null;

  trashEvents: EventList[] = []; 
  EditEvents: EventList[] = [];

  countries: { code: string, name: string }[] = [];
  citiesValue: string[] =[];
  districtsValue: any[] = [];
  wardsValue:any[]  = [];
  

  districtsWithCities:any[] = [];
  wardsWithDistricts:any[] = [];

  isOffline: boolean = false;
  isHybird: boolean = false;

  // Add cache for geocoding
  private geocodingCache: Map<string, { lat: number, lon: number }> = new Map();
  private lastGeocodingRequest: number = 0;
  private readonly GEOCODING_DELAY = 1000; // 1 second delay between requests

  showDeleteDialog: boolean = false;
  eventToDelete: EventList | null = null;

  constructor() {
    this.eventForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      startDate: ['', Validators.required],
      // imagePreviewUrl: [Validators.required],
      endDate: ['', Validators.required],
      details_address: ['', Validators.required],
      wards: ['', [Validators.required]],
      districts: ['', [Validators.required]],
      country: ['', [Validators.required]],
      city: ['', [Validators.required]],
      price: [0],
      maxAttendees: [100],
      tags: [''],
      eventType: ['offline', Validators.required]


    });
    countries.registerLocale(en);
  }



  get details_address() { return this.eventForm.get('details_address') }
  get wards() { return this.eventForm.get('wards'); }
  get districts() { return this.eventForm.get('districts'); }
  get country() { return this.eventForm.get('country'); }
  get city() { return this.eventForm.get('city'); }

  ngOnInit(): void {
    this.location.getCities().subscribe(dataCities =>{
      this.citiesValue = dataCities as string[];      
    })
    this.location.getDistricts().subscribe(dataDistricts =>{
      this.districtsValue = dataDistricts as unknown[];
    })
    this.location.getWards().subscribe(dataWards =>{
      this.wardsValue = dataWards as unknown[];
    })

    this.eventForm.get('city')?.valueChanges
    .pipe(
      debounceTime(300),
      distinctUntilChanged()
    )
    .subscribe(selectedCity =>{
      if(selectedCity && selectedCity.code){
        this.districtsWithCities = this.districtsValue.filter(
          district => district.parent_code === selectedCity.code
        );
        
        this.eventForm.get('districts')?.reset();
        this.eventForm.get('wards')?.reset();
        this.wardsWithDistricts = [];
        this.errorMessage = 'Please select a district';
      }
      else{
        this.districtsWithCities = [];
        this.wardsWithDistricts = [];
        this.errorMessage = 'Please select a city';
      }
    })

    this.eventForm.get('districts')?.valueChanges
    .pipe(
      debounceTime(300),
      distinctUntilChanged()
    )
    .subscribe(selectedDistrict =>{
      if(selectedDistrict && selectedDistrict.code){
        this.wardsWithDistricts = this.wardsValue.filter(
          ward => ward.parent_code === selectedDistrict.code
        );
        
        this.eventForm.get('wards')?.reset();
        this.errorMessage = 'Please select a ward';
      }
      else{
        this.wardsWithDistricts = [];
        this.errorMessage = 'Please select a district';
      }
    })

    this.eventForm.get('eventType')?.valueChanges.subscribe(value => {
      this.isOffline = value === 'offline';
      this.isHybird = value === 'hybrid'; 
    });
  
    // Khởi tạo theo giá trị ban đầu nếu có
    const value = this.eventForm.get('eventType')?.value;
    this.isOffline = value === 'offline';
    this.isHybird = value === 'hybrid';
    
    this.loadUserData();


    

    this.countries = this.getCountryList();
  }

  loadUserData(): void {
    const auth = getAuth();
    auth.onAuthStateChanged(user => {
      if (user) {
        this.usersService.getCurrentUserById(user.uid).subscribe(userData => {
          if (userData) {
            this.currentUser = userData;
            this.loadOrganizerEvents();
          } else {
            this.errorMessage = 'User data not found';
            this.router.navigate(['/home']);
          }
        });
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  loadOrganizerEvents(): void {
    if (this.currentUser?.id) {
      this.isLoading = true;
      from(this.eventService.getEventsByOrganizer(String(this.currentUser.id)))
        .subscribe({
          next: (events) => {
            this.currentOrganizerEvent = events;
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error loading events:', error);
            this.errorMessage = 'Failed to load events';
            this.isLoading = false;
          }
        });
    }
  }

  toggleCreateEventForm(): void {
    this.showCreateEventForm = !this.showCreateEventForm;
    if (!this.showCreateEventForm) {
      this.eventForm.reset();
      this.selectedImage = null;
      this.imagePreviewUrl = null;
      this.imageError = '';
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        this.imageError = 'Image size should be less than 5MB';
        return;
      }

      // Validate file type
      if (!file.type.match(/image\/(jpeg|png|gif|jpg)/)) {
        this.imageError = 'Only JPG, PNG and GIF images are allowed';
        return;
      }

      // Validate image dimensions
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        if (img.width < 800 || img.height < 600) {
          this.imageError = 'Image dimensions should be at least 800x600 pixels';
          return;
        }
        this.selectedImage = file;
        this.imageError = '';
        this.imagePreviewUrl = URL.createObjectURL(file);
      };
    }
  }

  removeImage(): void {
    this.selectedImage = null;
    this.imagePreviewUrl = null;
    this.imageError = '';
    // Reset the file input
    const fileInput = document.getElementById('image') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  triggerImageUpload(): void {
    const fileInput = document.getElementById('image') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  async uploadImage(): Promise<string | null> {
    if (!this.selectedImage) return null;

    try {
      return new Promise((resolve, reject) => {
        this.cloudinaryService.upLoadImage(this.selectedImage!).subscribe({
          next: (response: unknown) => {
            const responseData = response as CloudinaryResponse;
            resolve(responseData.secure_url);
          },
          error: (error) => {
            console.error('Error uploading image:', error);
            this.imageError = 'Failed to upload image. Please try again.';
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      this.imageError = 'Failed to upload image. Please try again.';
      return null;
    }
  }

  getCountryList(): { code: string, name: string }[] {
    try {
      const countryObj = countries.getNames("en", { select: "official" }) || {};
      return Object.entries(countryObj).map(([code, name]) => ({
        code,
        name
      }));
    } catch (error) {
      console.error('Error getting country list:', error);
      return [];
    }
  }

  async onSubmit(): Promise<void> {
    if (this.eventForm.valid) {
      this.isLoading = true;
      const formData = this.eventForm.value;

      // Upload image if selected
      let imageUrl = null;
      if (this.selectedImage) {
        imageUrl = await this.uploadImage();
        if (!imageUrl) {
          this.isLoading = false;
          return;
        }
      }

      
      

      const wards = this.getTrimmedString((this.eventForm.get('wards')?.value)?.name);
      const districts = this.getTrimmedString((this.eventForm.get('districts')?.value)?.name);
      const city = this.getTrimmedString((this.eventForm.get('city')?.value)?.name || '');
      const country =this.eventForm.get('country')?.value || '';
      const addressDetails = `${formData.details_address}, ${wards} ,${districts}, ${city}, ${country}`
      const location = await this.getLanLongFromAddress(addressDetails);
      if (!location) {
        this.isLoading = false;
        this.errorMessage = 'Không tìm thấy vị trí từ địa chỉ.';
        return;
      }
      const lat = location.lat;
      const lon = location.lon;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const tags = formData.tags
        ? formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => !!tag)
        : [];
      const nowIso = new Date().toISOString();
      
      const newEvent: Partial<EventList> = {
        core: {
          id: '',
          name: formData.name,
          shortDescription: formData.description?.slice(0, 140) ?? '',
          description: formData.description,
          content: formData.description,
          category: [],
          tags,
          eventType: formData.eventType,
          price: formData.price ?? 0
        },
        status: {
          visibility: 'public',
          featured: false,
          state: 'published',
          deletedAt: null
        },
        media: {
          coverImage: imageUrl || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg',
          primaryImage: imageUrl || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg',
          gallery: imageUrl ? [imageUrl] : [],
          image_url: imageUrl || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg'
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
          city: city ? (typeof city === 'string' ? { name: city } : city) : null,
          district: districts ? (typeof districts === 'string' ? { name: districts } : districts) : null,
          ward: wards ? (typeof wards === 'string' ? { name: wards } : wards) : null,
          country: country ? (typeof country === 'string' ? { name: country } : { name: country }) : null,
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
          catalog: [],
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
        // Legacy fields for backward compatibility
        name: formData.name,
        description: formData.description,
        content: formData.description,
        date_time_options: [{
          start_time: formData.startDate,
          end_time: formData.endDate,
          time_zone: timezone
        }],
        image_url: imageUrl || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg',
        price: formData.price,
        max_attendees: formData.maxAttendees,
        tags,
        event_type: formData.eventType,
        created_at: nowIso,
        updated_at: nowIso
      };

      this.eventService.addEvent(newEvent as EventList).subscribe({
        next: () => {
          this.successMessage = 'Event created successfully';
          this.showCreateEventForm = false;
          this.eventForm.reset();
          this.selectedImage = null;
          this.imagePreviewUrl = null;
          this.loadOrganizerEvents();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error creating event:', error);
          this.errorMessage = 'Failed to create event';
          this.isLoading = false;
        }
      });
    } else {
      this.errorMessage = 'Please fill in all required fields correctly';
      // Mark all fields as touched to show validation errors
      Object.keys(this.eventForm.controls).forEach(key => {
        const control = this.eventForm.get(key);
        if (control) {
          control.markAsTouched();
        }
      });
    }
  }

  setActiveTab(tab: 'upcoming' | 'past' | 'edit' | 'delete' | 'create' | undefined): void {
    this.activeTab = tab;
    if (this.showCreateEventForm) {
      this.toggleCreateEventForm();
    }
  }

  sanitizeImageUrl(imageUrl: string | undefined): SafeUrl | undefined {
    if (!imageUrl || imageUrl.trim() === '') {
      return undefined;
    }
    return this.sanitizer.bypassSecurityTrustUrl(imageUrl);
  }

  getComingUpEvents(event: EventList): boolean {
    const today = new Date();
    const dateTimeOptions = event.date_time_options || event.schedule?.dateTimeOptions || [];
    return dateTimeOptions.some((option: any) => {
      const start = new Date(option.start_time || option.startDate || '');
      const end = new Date(option.end_time || option.endDate || '');
      return start > today || end > today;
    });
  }

  getTotalRevenue(event: EventList): number {
    const price = event.core?.price ?? event.price ?? 0;
    const attendeesCount = event.engagement?.attendeesCount ?? event.attendees_count ?? 0;
    if (price && attendeesCount) {
      return price * attendeesCount;
    }
    return 0;
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEventStatus(event: EventList): string {
    const statusState = typeof event.status === 'string' ? event.status : event.status?.state;
    if (statusState === 'cancelled') {
      return 'Cancelled';
    }
    const today = new Date();
    const dateTimeOptions = event.date_time_options || event.schedule?.dateTimeOptions || [];
    if (dateTimeOptions.length === 0) {
      return 'Draft';
    }
    const firstOption = dateTimeOptions[0] as Record<string, unknown>;
    const startTime = firstOption['start_time'] || firstOption['startDate'] || '';
    const endTime = firstOption['end_time'] || firstOption['endDate'] || '';
    const startDate = startTime ? new Date(startTime as string) : new Date();
    const endDate = endTime ? new Date(endTime as string) : new Date();

    if (startDate > today) {
      return 'Upcoming';
    } else if (endDate < today) {
      return 'Past';
    } else {
      return 'Ongoing';
    }
  }

  editEvent(event: EventList): void {
    this.editEventid = event.id;
    this.activeTab = 'edit';
  }

  confirmDelete(event: EventList): void {
    this.eventToDelete = event;
    this.showDeleteDialog = true;
  }

  cancelDelete(): void {
    this.showDeleteDialog = false;
    this.eventToDelete = null;
  }

  async deleteEvent(event: EventList): Promise<void> {
    if (!event.id) return;

    try {
      await this.eventService.cancelEvent(event.id).toPromise();
      this.successMessage = 'Event cancelled successfully';
      this.showDeleteDialog = false;
      this.eventToDelete = null;
      this.loadOrganizerEvents();
    } catch (error) {
      console.error('Error cancelling event:', error);
      this.errorMessage = 'Failed to cancel event';
    }
  }

  async restoreEvent(event: EventList): Promise<void> {
    if (!event.id) return;

    try {
      await this.eventService.restoreEvent(event.id).toPromise();
      this.successMessage = 'Event restored successfully';
      this.loadOrganizerEvents();
    } catch (error) {
      console.error('Error restoring event:', error);
      this.errorMessage = 'Failed to restore event';
    }
  }

  // Filter events based on active tab
  getFilteredEvents(): EventList[] {
    if (!this.currentOrganizerEvent.length) return [];

    const today = new Date();
    if (this.activeTab === 'upcoming') {
      return this.currentOrganizerEvent.filter(event => {
        const startDate = new Date(event.date_time_options[0].start_time);
        return startDate > today && event.status !== 'cancelled';
      });
    } else if (this.activeTab === 'past') {
      return this.currentOrganizerEvent.filter(event => {
        const endDate = new Date(event.date_time_options[0].end_time);
        return endDate < today && event.status !== 'cancelled';
      });
    } else {
      return this.currentOrganizerEvent.filter(event => event.status !== 'cancelled');
    }
  }

  getTrimmedString(value: string | undefined): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  async getLanLongFromAddress(address: string): Promise<{ lat: number, lon: number } | null> {
    // Check cache first
    if (this.geocodingCache.has(address)) {
      const cachedResult = this.geocodingCache.get(address);
      return cachedResult ? cachedResult : null;
    }

    // Rate limiting
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
        // Cache the result
        this.geocodingCache.set(address, result);
        return result;
      } else {
        console.warn("Address not found:", address);
        return null;
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  }

  getEventIdEdit(eventId: string | undefined){
    return this.editEventid = eventId
  }
  onEventRestored() {
    this.setActiveTab('past'); // Chuyển về tab Past Events
    this.loadOrganizerEvents(); // Cập nhật lại danh sách
  }
}