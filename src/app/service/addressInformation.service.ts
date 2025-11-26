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



    getCities(): Observable<string[]>{
        return this.http.get<string[]>(this.citiesUrl)
    }

    getDistricts(): Observable<string[]>{
        return this.http.get<string[]>(this.districtsUrl)
    }

    getWards(): Observable<string[]>{
        return this.http.get<string[]>(this.wardsUrl)
    }

}