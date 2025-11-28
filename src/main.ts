import 'zone.js'; // Required for Angular change detection
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Disable hydration warning in development
if (process.env['NODE_ENV'] === 'development') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0]?.includes?.('NG0505')) return;
    originalWarn.apply(console, args);
  };
}

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
