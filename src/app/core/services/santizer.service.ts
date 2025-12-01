import { Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class SafeUrlService {
    // Nên đưa vào environment.ts, nhưng để đây cho gọn theo code cũ của bạn
    private readonly DEFAULT_IMAGE = 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1743794493/samples/coffee.jpg';
    private readonly DEFAULT_AVATAR = 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1744575077/default-avatar_br3ffh.png';

    // Public readonly properties for backward compatibility
    readonly DEFAULT_IMAGE_URL = this.DEFAULT_IMAGE;
    readonly DEFAULT_AVATAR_URL = this.DEFAULT_AVATAR;

    /**
     * Kiểm tra xem URL có hợp lệ để hiển thị không.
     * Thay vì chặn domain, ta chỉ chặn các protocol nguy hiểm (như javascript:)
     */
    private isValidUrl(url: string): boolean {
        if (!url || url.trim() === '') return false;

        // 1. Chấp nhận đường dẫn nội bộ (Assets / Relative)
        if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../') || url.startsWith('assets/')) {
            return true;
        }

        // 2. Chấp nhận HTTP / HTTPS
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return true;
        }

        // 3. Chấp nhận Data URI (Base64 images) - Nếu bạn cho phép upload ảnh dạng base64
        if (url.startsWith('data:image/')) {
            return true;
        }

        // Chặn tất cả các trường hợp còn lại (javascript:, vbscript:, etc.)
        return false;
    }

    /**
     * Hàm chính để lấy URL an toàn.
     * Trả về STRING (không phải SafeUrl) để Angular tự sanitize.
     */
    getSafeUrl(url: string | undefined | null, isAvatar: boolean = false): string {
        const fallback = isAvatar ? this.DEFAULT_AVATAR : this.DEFAULT_IMAGE;
        if (!url) {
            return fallback;
        }

        // Nếu URL hợp lệ về mặt định dạng -> Cho phép hiển thị
        if (this.isValidUrl(url)) {
            return url;
        }

        // Log warning nhẹ để debug nếu cần (không spam console)
        if (typeof window !== 'undefined') { // Check để tránh log rác trên Server (SSR)
             console.warn(`[SafeUrlService] Blocked unsafe URL format: ${url.substring(0, 50)}...`);
        }
        
        return fallback;
    }

    /**
     * Backward compatibility: sanitizeImageUrl trả về string thay vì SafeUrl
     * @deprecated Sử dụng getSafeUrl thay thế
     */
    sanitizeImageUrl(url: string | undefined | null, fallbackUrl?: string): string | undefined {
        if (!url || url.trim() === '') {
            return fallbackUrl || undefined;
        }
        if (this.isValidUrl(url)) {
            return url;
        }
        return fallbackUrl || undefined;
    }

    /**
     * Backward compatibility: getSafeImageUrl trả về string thay vì SafeUrl
     * @deprecated Sử dụng getSafeUrl thay thế
     */
    getSafeImageUrl(url: string | undefined | null, isAvatar: boolean = false): string {
        return this.getSafeUrl(url, isAvatar);
    }
}