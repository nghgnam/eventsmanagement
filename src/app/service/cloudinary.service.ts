import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { HttpClient } from "@angular/common/http";

@Injectable({
    providedIn: 'root'
})

export class CloudinaryService{
    private http = inject(HttpClient);

    private cloudName = 'dpiqldk0y'
    private uploadPreset ='nhnamStorange'
    private uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;


    upLoadImage(file: File): Observable<{public_id: string, secure_url: string}>{
        const formData = new FormData();
        formData.append('file',file);
        formData.append('upload_preset' , this.uploadPreset);
        return this.http.post<{public_id: string, secure_url: string}>(this.uploadUrl , formData)
    }
}
