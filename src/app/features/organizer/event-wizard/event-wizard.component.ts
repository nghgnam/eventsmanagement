import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

/**
 * Event Creation Wizard Component
 * 
 * Step-by-step wizard for creating events:
 * Step 1: Basic Info (Name, Time, Location with Map)
 * Step 2: Media (Upload Banner, Gallery with auto-crop)
 * Step 3: Ticketing (Multiple ticket types, pricing, sale dates)
 * Step 4: Settings (Custom registration form, SEO settings)
 */
@Component({
  selector: 'app-event-wizard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './event-wizard.component.html',
  styleUrls: ['./event-wizard.component.css']
})
export class EventWizardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  currentStep = 1;
  totalSteps = 4;

  // Step 1: Basic Info
  basicInfoForm: FormGroup;

  // Step 2: Media
  mediaForm: FormGroup;
  bannerPreview: string | null = null;
  galleryPreviews: string[] = [];

  // Step 3: Ticketing
  ticketingForm: FormGroup;
  ticketTypes: FormArray;

  // Step 4: Settings
  settingsForm: FormGroup;
  customQuestions: FormArray;

  constructor() {
    // Step 1: Basic Info
    this.basicInfoForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      eventType: ['offline', Validators.required],
      location: this.fb.group({
        address: [''],
        city: [''],
        country: [''],
        lat: [null],
        lng: [null]
      })
    });

    // Step 2: Media
    this.mediaForm = this.fb.group({
      banner: [''],
      gallery: this.fb.array([])
    });

    // Step 3: Ticketing
    this.ticketingForm = this.fb.group({
      ticketTypes: this.fb.array([])
    });
    this.ticketTypes = this.ticketingForm.get('ticketTypes') as FormArray;

    // Step 4: Settings
    this.settingsForm = this.fb.group({
      customQuestions: this.fb.array([]),
      seoSettings: this.fb.group({
        metaTitle: [''],
        metaDescription: [''],
        metaKeywords: ['']
      })
    });
    this.customQuestions = this.settingsForm.get('customQuestions') as FormArray;
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // TODO: Initialize wizard
    }
  }

  /**
   * Navigation between steps
   */
  nextStep(): void {
    if (this.validateCurrentStep()) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  /**
   * Validate current step before proceeding
   */
  validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.basicInfoForm.valid;
      case 2:
        return this.mediaForm.valid;
      case 3:
        return this.ticketingForm.valid;
      case 4:
        return this.settingsForm.valid;
      default:
        return false;
    }
  }

  /**
   * Add ticket type
   */
  addTicketType(): void {
    const ticketType = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      quantity: [100, [Validators.required, Validators.min(1)]],
      saleStartDate: ['', Validators.required],
      saleEndDate: ['', Validators.required]
    });
    this.ticketTypes.push(ticketType);
  }

  /**
   * Remove ticket type
   */
  removeTicketType(index: number): void {
    this.ticketTypes.removeAt(index);
  }

  /**
   * Add custom question
   */
  addCustomQuestion(): void {
    const question = this.fb.group({
      question: ['', Validators.required],
      type: ['text', Validators.required], // text, textarea, select, checkbox
      required: [false]
    });
    this.customQuestions.push(question);
  }

  /**
   * Remove custom question
   */
  removeCustomQuestion(index: number): void {
    this.customQuestions.removeAt(index);
  }

  /**
   * Handle banner upload
   */
  onBannerUpload(event: Event): void {
    // TODO: Upload banner to Cloudinary
    // TODO: Auto-crop image
    // TODO: Set preview
  }

  /**
   * Handle gallery upload
   */
  onGalleryUpload(event: Event): void {
    // TODO: Upload multiple images to Cloudinary
    // TODO: Auto-crop images
    // TODO: Set previews
  }

  /**
   * Remove gallery image
   */
  removeGalleryImage(index: number): void {
    // TODO: Remove image from gallery array
    // TODO: Update form array
  }

  /**
   * Submit wizard and create event
   */
  submitWizard(): void {
    if (!this.validateCurrentStep()) {
      return;
    }

    const eventData = {
      ...this.basicInfoForm.value,
      ...this.mediaForm.value,
      ...this.ticketingForm.value,
      ...this.settingsForm.value
    };

    // TODO: Create event via API
    // TODO: Show success message
    // TODO: Redirect to event dashboard
  }
}

