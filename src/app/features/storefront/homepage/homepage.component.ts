import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';

interface EventCard {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  startDate?: string | Date;
  location?: {
    address?: string;
  };
}

interface Category {
  id: string;
  name: string;
  icon?: string;
  count?: number;
  slug?: string;
}

/**
 * Homepage Component - SSR Critical
 * 
 * Features:
 * - Banner/Slider các sự kiện nổi bật (Hot/Trending)
 * - List sự kiện theo Location (IP-based detection)
 * - Categories (Music, Tech, Workshop...)
 * 
 * SEO Optimization:
 * - Server-side rendering for Google indexing
 * - Dynamic meta tags
 * - Structured data (JSON-LD)
 */
@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.css']
})
export class HomepageComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);

  // Featured events for banner/slider
  featuredEvents: EventCard[] = [];
  
  // Events by location (IP-based)
  locationBasedEvents: EventCard[] = [];
  
  // Event categories
  categories: Category[] = [];
  
  // Loading states
  isLoadingFeatured = false;
  isLoadingLocation = false;
  isLoadingCategories = false;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // TODO: Load featured events
      // TODO: Detect user location (IP-based)
      // TODO: Load events by location
      // TODO: Load categories
    }
  }

  /**
   * Load featured/trending events
   */
  loadFeaturedEvents(): void {
    // TODO: Implement
  }

  /**
   * Detect user location and load events
   */
  loadLocationBasedEvents(): void {
    // TODO: Implement IP-based location detection
    // TODO: Load events for that location
  }

  /**
   * Load event categories
   */
  loadCategories(): void {
    // TODO: Implement
  }

  // Helper methods for template type safety
  getEventImageUrl(event: EventCard): string {
    return event.image_url || '';
  }

  getEventName(event: EventCard): string {
    return event.name || '';
  }

  getEventDescription(event: EventCard): string | undefined {
    return event.description;
  }

  getEventStartDate(event: EventCard): string | Date | undefined {
    return event.startDate;
  }

  getEventLocationAddress(event: EventCard): string | undefined {
    return event.location?.address;
  }

  getCategoryIcon(category: Category): string | undefined {
    return category.icon;
  }

  getCategoryCount(category: Category): number | undefined {
    return category.count;
  }

  getCategorySlug(category: Category): string | undefined {
    return category.slug;
  }
}

