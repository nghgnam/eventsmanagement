import { Observable } from "rxjs";
import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
@Injectable({
    providedIn: 'root'
})

export class AddressInformationService{
    private http = inject(HttpClient);

    private wardsUrl = 'assets/location/wards.json';
    private districtsUrl = 'assets/location/districts.json';
    private citiesUrl = 'assets/location/cities.json';


    getCities(): Observable<unknown>{
        return this.http.get<unknown>(this.citiesUrl)
    }

    getDistricts(): Observable<unknown>{
        return this.http.get<unknown>(this.districtsUrl)
    }

    getWards(): Observable<unknown>{
        return this.http.get<unknown>(this.wardsUrl)
    }

}