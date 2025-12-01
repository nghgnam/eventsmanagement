import { APP_BASE_HREF } from '@angular/common';
import { renderApplication } from '@angular/platform-server';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import bootstrap from './src/main.server';

// SSR Timeout configuration
const SSR_TIMEOUT_MS = parseInt(process.env['SSR_TIMEOUT'] || '30000', 10); // Default 30s
const SSR_ENABLE_LOGGING = process.env['SSR_LOGGING'] !== 'false';

// Helper function to create timeout promise
function createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`SSR rendering timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

// SSR Logger for server-side
function logSSR(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
  if (!SSR_ENABLE_LOGGING) return;
  
  const timestamp = new Date().toISOString();
  const prefix = `[SSR] [${timestamp}] [${level.toUpperCase()}]`;
  
  switch (level) {
    case 'info':
      console.log(`${prefix} ${message}`, data || '');
      break;
    case 'warn':
      console.warn(`${prefix} ${message}`, data || '');
      break;
    case 'error':
      console.error(`${prefix} ${message}`, data || '', data?.stack || '');
      break;
  }
}

// Hàm app() trả về Express server
export function app(): express.Express {
  const server = express();
  
  // Xác định đường dẫn thư mục dist (dùng import.meta.url chuẩn ESM)
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(browserDistFolder, 'index.html');

  // Đọc file index.html
  const template = readFileSync(indexHtml, 'utf-8');

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Serve static files (css, js, images...) từ thư mục browser
  server.use(express.static(browserDistFolder, {
    maxAge: process.env['NODE_ENV'] === 'production' ? '1y' : '0',
    index: 'index.html',
    etag: true,
    lastModified: true
  }));

  // Error handler middleware - must be before routes
  server.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logSSR('error', 'Unhandled SSR Error', {
      url: req.url,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack
      }
    });
    // Fallback to client-side rendering on error
    try {
      res.sendFile(indexHtml);
    } catch (fallbackError) {
      logSSR('error', 'Failed to send fallback HTML', { error: fallbackError });
      res.status(500).send('Internal Server Error');
    }
  });

  // Xử lý tất cả các request khác bằng Angular Universal
  server.get('**', async (req, res, next) => {
    const startTime = Date.now();
    const { originalUrl, baseUrl, headers } = req;
    
    logSSR('info', `SSR Request started`, { url: originalUrl, method: req.method });
    
    try {
      // Handle proxy headers for correct URL construction
      const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
      const host = req.get('x-forwarded-host') || req.get('host') || headers.host || 'localhost:4000';
      const url = `${protocol}://${host}${originalUrl}`;

      logSSR('info', `Rendering application`, { url, protocol, host });

      // Race between rendering and timeout
      const renderPromise = renderApplication(bootstrap, {
        document: template,
        url: url,
        platformProviders: [
          { provide: APP_BASE_HREF, useValue: baseUrl }
        ],
      });

      const timeoutPromise = createTimeoutPromise(SSR_TIMEOUT_MS);

      // Wait for either rendering to complete or timeout
      const html = await Promise.race([renderPromise, timeoutPromise]);

      const duration = Date.now() - startTime;
      logSSR('info', `SSR Request completed`, { 
        url: originalUrl, 
        duration: `${duration}ms`,
        htmlLength: html.length 
      });

      res.send(html);
    } catch (err: unknown) {
      const duration = Date.now() - startTime;
      const error = err instanceof Error ? err : new Error(String(err));
      
      logSSR('error', `SSR rendering failed`, {
        url: originalUrl,
        duration: `${duration}ms`,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        timeout: error.message.includes('timeout')
      });

      // If timeout, log critical error
      if (error.message.includes('timeout')) {
        logSSR('error', `SSR TIMEOUT - Rendering took longer than ${SSR_TIMEOUT_MS}ms`, {
          url: originalUrl,
          duration: `${duration}ms`,
          timeout: SSR_TIMEOUT_MS
        });
      }

      // Fallback to client-side rendering
      try {
        res.sendFile(indexHtml);
        logSSR('info', `Fallback to client-side rendering`, { url: originalUrl });
      } catch (fallbackError) {
        logSSR('error', `Failed to send fallback HTML`, { 
          url: originalUrl,
          error: fallbackError 
        });
        res.status(500).send('Internal Server Error');
      }
    }
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

run();