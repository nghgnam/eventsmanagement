// shared.service.ts
import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  private readonly showBodyPageSignal = signal(true);
  readonly showBodyPage$ = toObservable(this.showBodyPageSignal.asReadonly());

  hideBodyPage(): void {
    this.showBodyPageSignal.set(false);
  }

  showBodyPage(): void {
    this.showBodyPageSignal.set(true);
  }

  toggleBodyPage(): void {
    this.showBodyPageSignal.update((value) => !value);
  }
}