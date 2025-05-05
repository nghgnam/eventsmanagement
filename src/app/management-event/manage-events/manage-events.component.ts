import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsersService } from '../../service/users.service';
import { User } from '../../types/userstype';
import { getAuth } from 'firebase/auth';
import { Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EventList } from '../../types/eventstype';
import { EventsService } from '../../service/events.service';
import { CloudinaryService } from '../../service/cloudinary.service';
import { Observable } from 'rxjs';
import { AddressInformationService } from '../../service/addressInformation.service';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';
import * as countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import { skip, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { EditEventComponent } from '../edit-event/edit-event.component';
import { TrashEventsComponent } from '../trash-events/trash-events.component';

@Component({
  selector: 'app-manage-events',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, ReactiveFormsModule, TrashEventsComponent ,EditEventComponent],
  templateUrl: './manage-events.component.html',
  styleUrls: ['./manage-events.component.css']
})
export class ManageEventsComponent implements OnInit {

  editEventid: string | undefined
  currentUser: User | undefined;
  currentOrganizerEvent: EventList[] = [];
  errorMessage: string = '';
  successMessage: string = '';
  showCreateEventForm: boolean = false;
  eventForm: FormGroup;
  activeTab: 'upcoming' | 'past' | 'edit' | 'delete' | 'create' |undefined; // 'upcoming' or 'past'
  isLoading: boolean = false;
  selectedImage: File | null = null;
  imageError: string = '';
  imagePreviewUrl: string | null = null;

  trashEvents: EventList[] = []; 
  EditEvents: EventList[] = [];

  countries: { code: string, name: string }[] = [];
  citiesValue: any[] =[];
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

  constructor(
    private usersService: UsersService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private eventService: EventsService,
    private cloudinaryService: CloudinaryService,
    private fb: FormBuilder,
    private location: AddressInformationService
  ) {
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
      this.citiesValue = dataCities;      
    })
    this.location.getDistricts().subscribe(dataDistricts =>{
      this.districtsValue = dataDistricts;
    })
    this.location.getWards().subscribe(dataWards =>{
      this.wardsValue = dataWards;
    })

    this.eventForm.get('city')?.valueChanges
    .pipe(
      debounceTime(300),
      distinctUntilChanged()
    )
    .subscribe(selectedCity =>{
      console.log('Selected City:', selectedCity); // Debug log
      if(selectedCity && selectedCity.code){
        console.log('Filtering districts for city code:', selectedCity.code); // Debug log
        this.districtsWithCities = this.districtsValue.filter(
          district => district.parent_code === selectedCity.code
        );
        console.log('Filtered districts:', this.districtsWithCities); // Debug log
        
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
      console.log('Selected District:', selectedDistrict); // Debug log
      if(selectedDistrict && selectedDistrict.code){
        console.log('Filtering wards for district code:', selectedDistrict.code); // Debug log
        this.wardsWithDistricts = this.wardsValue.filter(
          ward => ward.parent_code === selectedDistrict.code
        );
        console.log('Filtered wards:', this.wardsWithDistricts); // Debug log
        
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
      this.eventService.getEventsByOrganizer(String(this.currentUser.id)).subscribe({
        next: (eventData) => {
          this.currentOrganizerEvent = eventData || [];
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
          next: (response) => {
            resolve(response.secure_url);
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

      
      

      const wards = this.getTrimmedString((this.eventForm.get('wards')?.value).name);
      const districts = this.getTrimmedString((this.eventForm.get('districts')?.value).name);
      const city = this.getTrimmedString((this.eventForm.get('city')?.value).name);
      const country =this.eventForm.get('country')?.value;
      const addressDetails = `${formData.details_address}, ${wards} ,${districts}, ${city}, ${country}`
      const location = await this.getLanLongFromAddress(addressDetails);
      if (!location) {
        this.isLoading = false;
        this.errorMessage = 'Không tìm thấy vị trí từ địa chỉ.';
        return;
      }
      const lat = location.lat;
      const lon = location.lon;
      const newEvent: Partial<EventList> = {
        name: formData.name,
        description: formData.description,
        content: formData.description, // Using description as content for now
        date_time_options: [{
          start_time: formData.startDate,
          end_time: formData.endDate,
          time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }],
        location: {
          type: formData.eventType,
          address: addressDetails,
          coordinates: {
            latitude: lat,
            longitude: lon
          }
        },
        image_url: imageUrl || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg',
        price: formData.price,
        max_attendees: formData.maxAttendees,
        tags: formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag),
        event_type: formData.eventType,
        organizer: {
          id: String(this.currentUser?.id || '0'),
          name: this.currentUser?.fullName || '',
          followers: 0,
          profileImage: this.currentUser?.profileImage || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1744575077/default-avatar_br3ffh.png'
        }
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
        error: (error: any) => {
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
    console.log('Create event form is open. Closing it now.', this.activeTab);
    console.log('show active tab ', this.showCreateEventForm)
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
    return event.date_time_options.some(option => {
      const start = new Date(option.start_time);
      const end = new Date(option.end_time);
      return start > today || end > today;
    });
  }

  getTotalRevenue(event: EventList): number {
    if (event.price && event.attendees_count) {
      return event.price * event.attendees_count;
    }
    return 0;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEventStatus(event: EventList): string {
    const today = new Date();
    const startDate = new Date(event.date_time_options[0].start_time);
    const endDate = new Date(event.date_time_options[0].end_time);

    if (startDate > today) {
      return 'Upcoming';
    } else if (endDate < today) {
      return 'Past';
    } else {
      return 'Ongoing';
    }
  }

  editEvent(event: EventList): void {
    // Implement edit functionality
    console.log('Edit event:', event);
    // TODO: Implement edit event functionality
  }

  deleteEvent(event: EventList): void {
    // Implement delete functionality
    console.log('Delete event:', event);
    // TODO: Implement delete event functionality
  }

  // Filter events based on active tab
  getFilteredEvents(): EventList[] {
    if (!this.currentOrganizerEvent.length) return [];

    const today = new Date();
    return this.currentOrganizerEvent.filter(event => {
      const startDate = new Date(event.date_time_options[0].start_time);
      const endDate = new Date(event.date_time_options[0].end_time);

      if (this.activeTab === 'upcoming') {
        return startDate > today;
      } else if (this.activeTab === 'past') {
        return endDate < today;
      } else {
        return true; // Show all events if tab is not specified
      }
    });
  }

  getTrimmedString(value: any): string {
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
}