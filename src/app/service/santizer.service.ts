import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { Injectable, inject } from "@angular/core";
@Injectable({
    providedIn: 'root'
})
export class SafeUrlService{
    private sanitizer = inject(DomSanitizer);

    /** Inserted by Angular inject() migration for backwards compatibility */
    constructor(){}

    sanitizeImageUrl(url: string | undefined): SafeUrl | undefined {
        if (!url) return undefined;
        return this.sanitizer.bypassSecurityTrustUrl(url);
      }
}