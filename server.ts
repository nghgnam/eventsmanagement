import { Express, Request, Response, NextFunction } from 'express';
import { join } from 'path';
import { APP_BASE_HREF } from '@angular/common';
import { existsSync } from 'fs';

export function app(): Express {
  const server = require('express')();
  const distFolder = join(process.cwd(), 'dist/donate_blood_project/browser');
  const serverDistFolder = join(process.cwd(), 'dist/donate_blood_project/server');
  const indexHtml = existsSync(join(distFolder, 'index.original.html')) 
    ? 'index.original.html' 
    : 'index.html';

  server.get('*.*', (req: Request, res: Response, next: NextFunction) => {
    if (req.url.includes('.')) {
      res.sendFile(join(distFolder, req.url));
    } else {
      next();
    }
  });


  server.get('*', (req: Request, res: Response) => {
    res.render(indexHtml, { 
      req, 
      providers: [
        { provide: APP_BASE_HREF, useValue: req.baseUrl }
      ] 
    });
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}


export default app;


declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}