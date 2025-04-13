import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsersService } from '../service/users.service';
import { User } from '../types/userstype';
import { getAuth } from 'firebase/auth';
import { Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EventList } from '../types/eventstype';
import { EventsService } from '../service/events.service';
import { CloudinaryService } from '../service/cloudinary.service';

@Component({
  selector: 'app-manage-events',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './manage-events.component.html',
  styleUrls: ['./manage-events.component.css']
})
export class ManageEventsComponent implements OnInit {
  currentUser: User | undefined;
  currentOrganizerEvent: EventList[] = [];
  errorMessage: string = '';
  successMessage: string = '';
  showCreateEventForm: boolean = false;
  eventForm: FormGroup;
  activeTab: string = 'upcoming'; // 'upcoming' or 'past'
  isLoading: boolean = false;
  selectedImage: File | null = null;
  imageError: string = '';
  imagePreviewUrl: string | null = null;

  constructor(
    private usersService: UsersService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private eventService: EventsService,
    private cloudinaryService: CloudinaryService,
    private fb: FormBuilder
  ) {
    this.eventForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      location: ['', Validators.required],
      price: [0],
      maxAttendees: [100],
      tags: [''],
      eventType: ['offline', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadUserData();
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
      
      this.selectedImage = file;
      this.imageError = '';
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.imagePreviewUrl = (e.target?.result as string) || null;
      };
      reader.readAsDataURL(file);
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
          address: formData.location
        },
        image_url: imageUrl || 'https://via.placeholder.com/300x200?text=No+Image',
        price: formData.price,
        max_attendees: formData.maxAttendees,
        tags: formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag),
        event_type: formData.eventType,
        organizer: {
          id: String(this.currentUser?.id || '0'),
          name: this.currentUser?.fullName || '',
          followers: 0,
          profileImage: this.currentUser?.profileImage || 'https://via.placeholder.com/150x150?text=No+Image'
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

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    // Reset form when switching tabs
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
}


