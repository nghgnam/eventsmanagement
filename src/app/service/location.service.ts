import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private citiesUrl = 'assets/AddressVietNam/cities.json';
  private districtsUrl = 'assets/AddressVietNam/districts.json';
  private wardsUrl = 'assets/AddressVietNam/wards.json';

  constructor(private http: HttpClient) {}

  // Tải dữ liệu các thành phố
  getCities(): Observable<any> {
    return this.http.get<any>(this.citiesUrl);
  }

  // Tải dữ liệu các quận/huyện
  getDistricts(): Observable<any> {
    return this.http.get<any>(this.districtsUrl);
  }

  // Tải dữ liệu các phường/xã
  getWards(): Observable<any> {
    return this.http.get<any>(this.wardsUrl);
  }
}
