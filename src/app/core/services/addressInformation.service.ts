import { map, Observable, of } from "rxjs";
import { Injectable, PLATFORM_ID, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { isPlatformBrowser } from "@angular/common";

export interface LocationResult {
  name: string;
  city?: string;
  country?: string;
  lat: number;
  lng: number;
}
@Injectable({
  providedIn: 'root'
})


export class AddressInformationService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  private PHOTON_API = 'https://photon.komoot.io/api/';

  private wardsUrl = 'assets/location/wards.json';
  private districtsUrl = 'assets/location/districts.json';
  private citiesUrl = 'assets/location/cities.json';


  getCities(): Observable<unknown> {
    return this.fetchAsset(this.citiesUrl);
  }

  getDistricts(): Observable<unknown> {
    return this.fetchAsset(this.districtsUrl);
  }

  getWards(): Observable<unknown> {
    return this.fetchAsset(this.wardsUrl);
  }

  private fetchAsset(url: string): Observable<unknown> {
    if (isPlatformBrowser(this.platformId)) {
      return this.http.get<unknown>(url);
    }
    // During SSR we skip HTTP requests to the dev server to avoid timeouts.
    return of([]);
  }

  searchPlaces(query: string) {
    const url = `${this.PHOTON_API}?q=${query}&limit=5`;
    return this.http.get<unknown>(url).pipe(
      /* eslint-disable @typescript-eslint/no-explicit-any */
      map((res: any) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        return res.features.map((feature: any) => ({
          name: feature.properties.name,
          city: feature.properties.city,
          country: feature.properties.country,
          lat: feature.geometry.coordinates[1],
          lng: feature.geometry.coordinates[0]
        } as LocationResult));
      })
    );
  }
}