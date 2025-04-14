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
      title: 'Blood Donation Drive - Save Lives Today'
    },
    {
      image: 'assets/images/images_2.jpg',
      title: 'Community Blood Bank Event'
    },
    {
      image: 'assets/images/images_3.png',
      title: 'Emergency Blood Donation Campaign'
    }
  ];

  currentSlideIndex = 0;
  private autoSlideInterval: any;
  autoSlideTime = 5000; // 5 seconds
  isTransitioning = false;
  slideDirection: 'left' | 'right' = 'right';

  ngOnInit() {
    this.startAutoSlide();
  }

  ngAfterViewInit() {
    // Thêm class để bắt đầu hiệu ứng
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
    this.autoSlideInterval = setInterval(() => {
      this.nextSlide();
    }, this.autoSlideTime);
  }

  stopAutoSlide() {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }

  nextSlide() {
    if (this.isTransitioning) return;
    
    this.slideDirection = 'right';
    this.isTransitioning = true;
    
    // Thêm class để bắt đầu hiệu ứng
    if (this.slideContainer) {
      this.slideContainer.nativeElement.classList.add('slide-right');
    }
    
    // Đợi hiệu ứng hoàn thành
    setTimeout(() => {
      this.currentSlideIndex = (this.currentSlideIndex + 1) % this.slides.length;
      this.isTransitioning = false;
      
      // Xóa class hiệu ứng
      if (this.slideContainer) {
        this.slideContainer.nativeElement.classList.remove('slide-right');
      }
    }, 500); // Thời gian phải khớp với thời gian transition trong CSS
  }

  prevSlide() {
    if (this.isTransitioning) return;
    
    this.slideDirection = 'left';
    this.isTransitioning = true;
    
    // Thêm class để bắt đầu hiệu ứng
    if (this.slideContainer) {
      this.slideContainer.nativeElement.classList.add('slide-left');
    }
    
    // Đợi hiệu ứng hoàn thành
    setTimeout(() => {
      this.currentSlideIndex = (this.currentSlideIndex - 1 + this.slides.length) % this.slides.length;
      this.isTransitioning = false;
      
      // Xóa class hiệu ứng
      if (this.slideContainer) {
        this.slideContainer.nativeElement.classList.remove('slide-left');
      }
    }, 500); // Thời gian phải khớp với thời gian transition trong CSS
  }

  goToSlide(index: number) {
    if (this.isTransitioning || index === this.currentSlideIndex) return;
    
    this.slideDirection = index > this.currentSlideIndex ? 'right' : 'left';
    this.isTransitioning = true;
    
    // Thêm class để bắt đầu hiệu ứng
    if (this.slideContainer) {
      this.slideContainer.nativeElement.classList.add(
        this.slideDirection === 'right' ? 'slide-right' : 'slide-left'
      );
    }
    
    // Đợi hiệu ứng hoàn thành
    setTimeout(() => {
      this.currentSlideIndex = index;
      this.isTransitioning = false;
      
      // Xóa class hiệu ứng
      if (this.slideContainer) {
        this.slideContainer.nativeElement.classList.remove('slide-right', 'slide-left');
      }
    }, 500); // Thời gian phải khớp với thời gian transition trong CSS
  }

  // Pause auto-slide when user interacts with the slider
  onSlideInteraction() {
    this.stopAutoSlide();
    this.startAutoSlide();
  }
}
