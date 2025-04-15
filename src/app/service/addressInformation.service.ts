import { Observable } from "rxjs";
import { Inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
@Injectable({
    providedIn: 'root'
})

export class AddressInformationService{
    private wardsUrl = 'assets/location/wards.json';
    private districtsUrl = 'assets/location/districts.json';
    private citiesUrl = 'assets/location/cities.json';


    constructor(private http: HttpClient){

    }


    getCities(): Observable<any>{
        return this.http.get<any>(this.citiesUrl)
    }

    getDistricts(): Observable<any>{
        return this.http.get<any>(this.districtsUrl)
    }

    getWards(): Observable<any>{
        return this.http.get<any>(this.wardsUrl)
    }

}