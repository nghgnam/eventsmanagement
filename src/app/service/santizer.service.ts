import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { Inject, Injectable } from "@angular/core";
@Injectable({
    providedIn: 'root'
})
export class SafeUrlService{
    constructor(private sanitizer: DomSanitizer){

    }

    sanitizeImageUrl(url: string | undefined): SafeUrl | undefined {
        if (!url) return undefined;
        return this.sanitizer.bypassSecurityTrustUrl(url);
      }
}