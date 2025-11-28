import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-body-slideshow',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './body-slideshow.component.html',
  styleUrls: ['./body-slideshow.component.css']
})
export class BodySlideshowComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('slideContainer') slideContainer!: ElementRef;
  private platformId = inject(PLATFORM_ID);
  
  slides = [
    {
      image: 'assets/images/images_1.jpg',
      title: 'Blood Donation Drive - Save Lives Today',
      description: 'Join us in our mission to save lives through blood donation'
    },
    {
      image: 'assets/images/images_2.jpg',
      title: 'Community Blood Bank Event',
      description: 'Together we can make a difference in our community'
    },
    {
      image: 'assets/images/images_3.png',
      title: 'Emergency Blood Donation Campaign',
      description: 'Your donation can help someone in need'
    }
  ];

  currentSlideIndex = 0;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  private autoSlideInterval: any = undefined;
  autoSlideTime = 5000; // 5 seconds
  isTransitioning = false;
  slideDirection: 'left' | 'right' = 'right';
  isHovered = false;

  ngOnInit() {
    // Only start auto slide on browser, not during SSR
    if (isPlatformBrowser(this.platformId)) {
      this.startAutoSlide();
    }
  }

  ngAfterViewInit() {
    // Only run on browser, not during SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // Add class to start animation
    setTimeout(() => {
      if (this.slideContainer) {
        this.slideContainer.nativeElement.classList.add('initialized');
      }
    }, 100);
  }

  ngOnDestroy() {
    this.stopAutoSlide();
  }

  startAutoSlide() {
    // Only run on browser, not during SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (!this.isHovered) {
      this.autoSlideInterval = setInterval(() => {
        this.nextSlide();
      }, this.autoSlideTime);
    }
  }

  stopAutoSlide() {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
      this.autoSlideInterval = undefined;
    }
  }

  onMouseEnter() {
    this.isHovered = true;
    this.stopAutoSlide();
  }

  onMouseLeave() {
    this.isHovered = false;
    this.startAutoSlide();
  }

  nextSlide() {
    // Only run on browser, not during SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.isTransitioning) return;
    
    this.slideDirection = 'right';
    this.isTransitioning = true;
    
    // Add class to start animation
    if (this.slideContainer) {
      this.slideContainer.nativeElement.classList.add('slide-right');
    }
    
    // Wait for animation to complete
    setTimeout(() => {
      this.currentSlideIndex = (this.currentSlideIndex + 1) % this.slides.length;
      this.isTransitioning = false;
      
      // Remove animation class
      if (this.slideContainer) {
        this.slideContainer.nativeElement.classList.remove('slide-right');
      }
    }, 500); // Time must match CSS transition duration
  }

  prevSlide() {
    // Only run on browser, not during SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.isTransitioning) return;
    
    this.slideDirection = 'left';
    this.isTransitioning = true;
    
    // Add class to start animation
    if (this.slideContainer) {
      this.slideContainer.nativeElement.classList.add('slide-left');
    }
    
    // Wait for animation to complete
    setTimeout(() => {
      this.currentSlideIndex = (this.currentSlideIndex - 1 + this.slides.length) % this.slides.length;
      this.isTransitioning = false;
      
      // Remove animation class
      if (this.slideContainer) {
        this.slideContainer.nativeElement.classList.remove('slide-left');
      }
    }, 500); // Time must match CSS transition duration
  }

  goToSlide(index: number) {
    // Only run on browser, not during SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.isTransitioning || index === this.currentSlideIndex) return;
    
    this.slideDirection = index > this.currentSlideIndex ? 'right' : 'left';
    this.isTransitioning = true;
    
    // Add class to start animation
    if (this.slideContainer) {
      this.slideContainer.nativeElement.classList.add(
        this.slideDirection === 'right' ? 'slide-right' : 'slide-left'
      );
    }
    
    // Wait for animation to complete
    setTimeout(() => {
      this.currentSlideIndex = index;
      this.isTransitioning = false;
      
      // Remove animation class
      if (this.slideContainer) {
        this.slideContainer.nativeElement.classList.remove('slide-right', 'slide-left');
      }
    }, 500); // Time must match CSS transition duration
  }

  // Pause auto-slide when user interacts with the slider
  onSlideInteraction() {
    this.stopAutoSlide();
    this.startAutoSlide();
  }
}