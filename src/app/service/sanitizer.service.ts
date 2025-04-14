import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl, SafeScript, SafeStyle, SafeUrl } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class SanitizerService {
  constructor(private sanitizer: DomSanitizer) { }

  /**
   * Sanitize URL for images and other resources
   * @param url URL to sanitize
   * @returns SafeUrl or null if URL is undefined
   */
  sanitizeUrl(url: string | undefined): SafeUrl | null {
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }

  /**
   * Sanitize HTML content
   * @param html HTML content to sanitize
   * @returns SafeHtml or null if HTML is undefined
   */
  sanitizeHtml(html: string | undefined): SafeHtml | null {
    if (!html) return null;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /**
   * Sanitize CSS styles
   * @param style CSS style to sanitize
   * @returns SafeStyle or null if style is undefined
   */
  sanitizeStyle(style: string | undefined): SafeStyle | null {
    if (!style) return null;
    return this.sanitizer.bypassSecurityTrustStyle(style);
  }

  /**
   * Sanitize JavaScript code
   * @param script JavaScript code to sanitize
   * @returns SafeScript or null if script is undefined
   */
  sanitizeScript(script: string | undefined): SafeScript | null {
    if (!script) return null;
    return this.sanitizer.bypassSecurityTrustScript(script);
  }

  /**
   * Sanitize resource URL (for iframes, etc.)
   * @param url Resource URL to sanitize
   * @returns SafeResourceUrl or null if URL is undefined
   */
  sanitizeResourceUrl(url: string | undefined): SafeResourceUrl | null {
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /**
   * Get default avatar URL
   * @returns Default avatar URL
   */
  getDefaultAvatarUrl(): string {
    return 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1744575077/default-avatar_br3ffh.png';
  }

  /**
   * Format text to be safe for display
   * @param text Text to format
   * @returns Formatted text or empty string if text is undefined
   */
  formatText(text: string | undefined): string {
    if (!text) return '';
    return text.trim();
  }

  /**
   * Truncate text to a specific length
   * @param text Text to truncate
   * @param maxLength Maximum length
   * @returns Truncated text
   */
  truncateText(text: string | undefined, maxLength: number = 100): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Format date to a readable string
   * @param date Date to format
   * @param format Format string (default: 'mediumDate')
   * @returns Formatted date string
   */
  formatDate(date: Date | string | undefined, format: string = 'mediumDate'): string {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  }

  /**
   * Format currency
   * @param amount Amount to format
   * @param currency Currency code (default: 'USD')
   * @returns Formatted currency string
   */
  formatCurrency(amount: number | undefined, currency: string = 'USD'): string {
    if (amount === undefined) return 'Free';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  }
} 