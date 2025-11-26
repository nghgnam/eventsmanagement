import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private citiesUrl = 'assets/AddressVietNam/cities.json';
  private districtsUrl = 'assets/AddressVietNam/districts.json';
  private wardsUrl = 'assets/AddressVietNam/wards.json';

  private http = inject(HttpClient);

  // Tải dữ liệu các thành phố
  getCities(): Observable<string[]> {
    return this.http.get<string[]>(this.citiesUrl);
  }

  // Tải dữ liệu các quận/huyện
  getDistricts(): Observable<string[]> {
    return this.http.get<string[]>(this.districtsUrl);
  }

  // Tải dữ liệu các phường/xã
  getWards(): Observable<string[]> {
    return this.http.get<string[]>(this.wardsUrl);
  }
}
