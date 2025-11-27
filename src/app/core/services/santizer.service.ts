import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { Injectable, inject } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class SafeUrlService{
    private sanitizer = inject(DomSanitizer);
    
    // Default fallback image from Cloudinary
    readonly DEFAULT_IMAGE_URL = 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg';
    readonly DEFAULT_AVATAR_URL = 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1744575077/default-avatar_br3ffh.png';
    
    // Allowed image domains
    private readonly ALLOWED_DOMAINS = [
        'res.cloudinary.com',
        'cloudinary.com',
        'images.unsplash.com',
        'unsplash.com',
        'via.placeholder.com',
        'localhost',
        '127.0.0.1'
    ];

    /**
     * Validates if a URL is from an allowed domain
     */
    private isValidImageUrl(url: string): boolean {
        if (!url) return false;
        
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            
            // Check if hostname matches any allowed domain
            return this.ALLOWED_DOMAINS.some(domain => 
                hostname === domain || hostname.endsWith('.' + domain)
            );
        } catch (error) {
            // If URL parsing fails, check if it's a relative path
            return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
        }
    }

    /**
     * Sanitizes image URL and validates it's from an allowed domain
     * Returns undefined if URL is invalid, allowing components to use fallback
     */
    sanitizeImageUrl(url: string | undefined | null, fallbackUrl?: string): SafeUrl | undefined {
        if (!url || url.trim() === '') {
            return fallbackUrl ? this.sanitizer.bypassSecurityTrustUrl(fallbackUrl) : undefined;
        }
        
        // Validate URL is from allowed domain
        if (!this.isValidImageUrl(url)) {
            console.warn(`[SafeUrlService] Invalid image URL domain: ${url}. Using fallback.`);
            return fallbackUrl ? this.sanitizer.bypassSecurityTrustUrl(fallbackUrl) : undefined;
        }
        
        return this.sanitizer.bypassSecurityTrustUrl(url);
    }

    /**
     * Gets a safe image URL with fallback
     */
    getSafeImageUrl(url: string | undefined | null, isAvatar: boolean = false): SafeUrl {
        const fallback = isAvatar ? this.DEFAULT_AVATAR_URL : this.DEFAULT_IMAGE_URL;
        return this.sanitizeImageUrl(url, fallback) || this.sanitizer.bypassSecurityTrustUrl(fallback);
    }
}