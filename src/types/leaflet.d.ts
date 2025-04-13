declare namespace L {
  function map(id: string): Map;
  function tileLayer(url: string, options?: any): TileLayer;
  function marker(latlng: [number, number], options?: any): Marker;
  function divIcon(options: any): DivIcon;
  function popup(options?: any): Popup;
  function latLng(latitude: number, longitude: number): LatLng;

  interface Map {
    setView(center: [number, number], zoom: number): this;
    remove(): void;
    getCenter(): LatLng;
    on(event: string, handler: Function): this;
    off(event: string, handler: Function): this;
  }

  interface TileLayer {
    addTo(map: Map): this;
  }

  interface Marker {
    addTo(map: Map): this;
    remove(): void;
    on(event: string, handler: Function): this;
    off(event: string, handler: Function): this;
    getLatLng(): LatLng;
    bindPopup(content: string | HTMLElement, options?: any): this;
  }

  interface DivIcon {
    options: any;
  }

  interface Popup {
    setLatLng(latlng: LatLng): this;
    setContent(content: string | HTMLElement): this;
    openOn(map: Map): this;
  }

  interface LatLng {
    lat: number;
    lng: number;
  }
}

declare global {
  interface Window {
    L: typeof L;
  }
} 