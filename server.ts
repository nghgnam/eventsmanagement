import 'zone.js/nodezone';
import { Express, Request, Response, NextFunction } from 'express';
import { join } from 'path';
import { APP_BASE_HREF } from '@angular/common';
import { existsSync } from 'fs';
import { AppServerModule } from './src/app/app.server.module';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): Express {
  const server = require('express')();
  const distFolder = join(process.cwd(), 'dist/donate_blood_project/browser');
  const indexHtml = existsSync(join(distFolder, 'index.original.html')) ? 'index.original.html' : 'index.html';

  // Serve static files from /browser
  server.get('*.*', (req: Request, res: Response, next: NextFunction) => {
    if (req.url.includes('.')) {
      res.sendFile(join(distFolder, req.url));
    } else {
      next();
    }
  });

  // All regular routes use the Angular SSR engine
  server.get('*', (req: Request, res: Response) => {
    res.render(indexHtml, { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] });
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export * from './src/app/app.server.module';

