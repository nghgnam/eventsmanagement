import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { Injectable, inject } from "@angular/core";
@Injectable({
    providedIn: 'root'
})
export class SafeUrlService{
    private sanitizer = inject(DomSanitizer);

    sanitizeImageUrl(url: string | undefined): SafeUrl | undefined {
        if (!url) return undefined;
        return this.sanitizer.bypassSecurityTrustUrl(url);
      }
}