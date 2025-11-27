import { Directive, ElementRef, Input, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SafeUrlService } from '../../core/services/santizer.service';

@Directive({
  selector: 'img[appImageErrorHandler]',
  standalone: true
})
export class ImageErrorHandlerDirective implements OnInit {
  private el = inject(ElementRef<HTMLImageElement>);
  private sanitizer = inject(SafeUrlService);
  private platformId = inject(PLATFORM_ID);
  private hasErrored = false;
  
  @Input() fallbackUrl?: string;
  @Input() isAvatar: boolean = false;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const img = this.el.nativeElement;
    
    // Set default fallback if not provided
    if (!this.fallbackUrl) {
      this.fallbackUrl = this.isAvatar 
        ? this.sanitizer.DEFAULT_AVATAR_URL 
        : this.sanitizer.DEFAULT_IMAGE_URL;
    }

    // Handle image load error
    img.addEventListener('error', () => {
      if (this.hasErrored) {
        // Already tried fallback, prevent infinite loop
        img.style.display = 'none';
        img.alt = 'Image not available';
        return;
      }

      console.warn(`[ImageErrorHandler] Failed to load image: ${img.src}. Using fallback.`);
      this.hasErrored = true;
      
      // Try fallback URL
      if (img.src !== this.fallbackUrl) {
        img.src = this.fallbackUrl || this.sanitizer.DEFAULT_IMAGE_URL;
      } else {
        // Fallback also failed, hide image
        img.style.display = 'none';
        img.alt = 'Image not available';
      }
    });

    // Pre-validate URL on load
    const originalSrc = img.getAttribute('src') || img.src;
    if (originalSrc && this.isInvalidUrl(originalSrc)) {
      console.warn(`[ImageErrorHandler] Invalid image URL detected: ${originalSrc}. Using fallback.`);
      img.src = this.fallbackUrl || this.sanitizer.DEFAULT_IMAGE_URL;
    }
  }

  /**
   * Check if URL is invalid (not from allowed domains)
   */
  private isInvalidUrl(url: string): boolean {
    if (!url || url.trim() === '') return true;
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Check against common blocked domains or non-allowed domains
      const blockedDomains = ['gizmodo.com', 'example.com'];
      if (blockedDomains.some(domain => hostname.includes(domain))) {
        return true;
      }
      
      // Allow relative paths
      if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
        return false;
      }
      
      // Check if it's from Cloudinary (allowed)
      if (hostname.includes('cloudinary.com')) {
        return false;
      }
      
      // For other domains, we'll let the error handler deal with it
      return false;
    } catch (error) {
      // Relative path or invalid URL format
      return false;
    }
  }
}

