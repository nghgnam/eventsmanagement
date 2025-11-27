import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private citiesUrl = 'assets/AddressVietNam/cities.json';
  private districtsUrl = 'assets/AddressVietNam/districts.json';
  private wardsUrl = 'assets/AddressVietNam/wards.json';
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  // Tải dữ liệu các thành phố
  getCities(): Observable<string[]> {
    return this.fetchAsset<string[]>(this.citiesUrl);
  }

  // Tải dữ liệu các quận/huyện
  getDistricts(): Observable<string[]> {
    return this.fetchAsset<string[]>(this.districtsUrl);
  }

  // Tải dữ liệu các phường/xã
  getWards(): Observable<string[]> {
    return this.fetchAsset<string[]>(this.wardsUrl);
  }

  private fetchAsset<T>(url: string): Observable<T> {
    if (isPlatformBrowser(this.platformId)) {
      return this.http.get<T>(url);
    }
    // During SSR avoid hitting dev server; data will load on client instead.
    return of([] as unknown as T);
  }
}
