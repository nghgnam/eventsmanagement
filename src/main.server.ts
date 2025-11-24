import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment'; 
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideServerRendering } from '@angular/platform-server';
if (environment.production) {
  enableProdMode();
}

export function bootstrap() {
  return bootstrapApplication(AppComponent, {
    providers: [
      provideServerRendering()
    ]
  });
}

export default bootstrap;
