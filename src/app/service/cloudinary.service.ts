import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpClient } from "@angular/common/http";

@Injectable({
    providedIn: 'root'
})

export class CloudinaryService{
    private cloudName = 'dpiqldk0y'
    private uploadPreset ='nhnamStorange'
    private uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

    constructor(private http : HttpClient){

    }

    upLoadImage(file: File): Observable<any>{
        const formData = new FormData();
        formData.append('file',file);
        formData.append('upload_preset' , this.uploadPreset);
        return this.http.post(this.uploadUrl , formData)
    }
}