import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppServerModule } from './app/app.server.module';
// import { environment } from './environments/environment';
import { environment } from './environments/environment'; // Adjusted to import production environment
if (environment.production) {
  enableProdMode();
}

export function bootstrap() {
  return platformBrowserDynamic().bootstrapModule(AppServerModule);
}

export default bootstrap;
