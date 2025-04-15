import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-body-slideshow',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './body-slideshow.component.html',
  styleUrls: ['./body-slideshow.component.css']
})
export class BodySlideshowComponent implements OnInit, OnDestroy {
  @ViewChild('slideContainer') slideContainer!: ElementRef;
  
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
  private autoSlideInterval: any;
  autoSlideTime = 5000; // 5 seconds
  isTransitioning = false;
  slideDirection: 'left' | 'right' = 'right';
  isHovered = false;

  ngOnInit() {
    this.startAutoSlide();
  }

  ngAfterViewInit() {
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
    if (!this.isHovered) {
      this.autoSlideInterval = setInterval(() => {
        this.nextSlide();
      }, this.autoSlideTime);
    }
  }

  stopAutoSlide() {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
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