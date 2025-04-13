// shared.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  private showBodyPageSubject = new BehaviorSubject<boolean>(true);
  showBodyPage$ = this.showBodyPageSubject.asObservable();

  hideBodyPage(): void {
    this.showBodyPageSubject.next(false);
  }

  showBodyPage(): void {
    this.showBodyPageSubject.next(true); 
  }
}