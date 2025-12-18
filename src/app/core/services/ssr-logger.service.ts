/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export interface SSRLogEntry {
  timestamp: string;
  level: LogLevel;
  component?: string;
  service?: string;
  message: string;
  data?: any;
  stack?: string;
  duration?: number;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SSRLoggerService {
  private platformId = inject(PLATFORM_ID);
  private logs: SSRLogEntry[] = [];
  private readonly MAX_LOGS = 1000;
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  
  // Performance tracking
  private timers = new Map<string, number>();
  private performanceMetrics: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map();

  /**
   * Log a message with level and context
   */
  log(level: LogLevel, message: string, data?: any, component?: string, service?: string): void {
    const entry: SSRLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      service,
      message,
      data: this.sanitizeData(data),
      url: this.isBrowser && typeof window !== 'undefined' ? window.location.href : undefined
    };

    // Add stack trace for errors
    if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
      entry.stack = new Error().stack;
    }

    this.logs.push(entry);
    
    // Keep only last MAX_LOGS entries
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }

    // Console output with formatting
    this.consoleLog(entry);
  }

  /**
   * Debug level logging
   */
  debug(message: string, data?: any, component?: string, service?: string): void {
    this.log(LogLevel.DEBUG, message, data, component, service);
  }

  /**
   * Info level logging
   */
  info(message: string, data?: any, component?: string, service?: string): void {
    this.log(LogLevel.INFO, message, data, component, service);
  }

  /**
   * Warning level logging
   */
  warn(message: string, data?: any, component?: string, service?: string): void {
    this.log(LogLevel.WARN, message, data, component, service);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: any, component?: string, service?: string): void {
    const errorData = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
    this.log(LogLevel.ERROR, message, errorData, component, service);
  }

  /**
   * Critical error logging
   */
  critical(message: string, error?: any, component?: string, service?: string): void {
    const errorData = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
    this.log(LogLevel.CRITICAL, message, errorData, component, service);
  }

  /**
   * Start performance timer - SSR safe
   */
  startTimer(label: string): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.timers.set(label, now);
  }

  /**
   * End performance timer and log duration - SSR safe
   */
  endTimer(label: string, message?: string, component?: string, service?: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      this.warn(`Timer '${label}' was not started`, undefined, component, service);
      return 0;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const duration = now - startTime;
    this.timers.delete(label);

    // Update metrics
    const metrics = this.performanceMetrics.get(label) || { count: 0, totalTime: 0, avgTime: 0 };
    metrics.count++;
    metrics.totalTime += duration;
    metrics.avgTime = metrics.totalTime / metrics.count;
    this.performanceMetrics.set(label, metrics);

    const logMessage = message || `Timer '${label}' completed`;
    this.log(LogLevel.INFO, logMessage, { duration: `${duration.toFixed(2)}ms`, label }, component, service);

    return duration;
  }

  /**
   * Log SSR-specific issues
   */
  logSSRIssue(issue: string, details?: any, component?: string, service?: string): void {
    const isSSR = !this.isBrowser;
    const message = isSSR 
      ? `[SSR] ${issue}` 
      : `[Browser] ${issue}`;
    
    this.warn(message, details, component, service);
  }

  /**
   * Log Firebase operations
   */
  logFirebaseOperation(operation: string, success: boolean, error?: any, component?: string, service?: string): void {
    if (success) {
      this.debug(`Firebase ${operation}`, undefined, component, service);
    } else {
      this.error(`Firebase ${operation} failed`, error, component, service);
    }
  }

  /**
   * Log HTTP requests
   */
  logHttpRequest(method: string, url: string, status?: number, duration?: number, error?: any, component?: string, service?: string): void {
    const data: any = { method, url };
    if (status) data.status = status;
    if (duration) data.duration = `${duration}ms`;
    
    if (error) {
      this.error(`HTTP ${method} ${url}`, error, component, service);
    } else if (status && status >= 400) {
      this.warn(`HTTP ${method} ${url} returned ${status}`, data, component, service);
    } else {
      this.debug(`HTTP ${method} ${url}`, data, component, service);
    }
  }

  /**
   * Log Observable subscriptions
   */
  logSubscription(action: 'subscribe' | 'unsubscribe' | 'complete' | 'error', observable: string, error?: any, component?: string, service?: string): void {
    const message = `Observable ${action}: ${observable}`;
    if (error) {
      this.error(message, error, component, service);
    } else {
      this.debug(message, undefined, component, service);
    }
  }

  /**
   * Get all logs
   */
  getLogs(): SSRLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): SSRLogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs filtered by component
   */
  getLogsByComponent(component: string): SSRLogEntry[] {
    return this.logs.filter(log => log.component === component);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Map<string, { count: number; totalTime: number; avgTime: number }> {
    return new Map(this.performanceMetrics);
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    errors: SSRLogEntry[];
    warnings: SSRLogEntry[];
    performance: Map<string, { count: number; totalTime: number; avgTime: number }>;
  } {
    const byLevel: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.CRITICAL]: 0
    };

    this.logs.forEach(log => {
      byLevel[log.level]++;
    });

    return {
      total: this.logs.length,
      byLevel,
      errors: this.getLogsByLevel(LogLevel.ERROR).concat(this.getLogsByLevel(LogLevel.CRITICAL)),
      warnings: this.getLogsByLevel(LogLevel.WARN),
      performance: this.getPerformanceMetrics()
    };
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      platform: this.isBrowser ? 'browser' : 'server',
      logs: this.logs,
      summary: this.getSummary()
    }, null, 2);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
    this.timers.clear();
    this.performanceMetrics.clear();
  }

  /**
   * Console output with color coding
   */
  private consoleLog(entry: SSRLogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level}]`;
    const context = entry.component || entry.service ? `[${entry.component || entry.service}]` : '';
    const message = `${prefix} ${context} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        if (!this.isBrowser || (this.isBrowser && (window as any).__SSR_DEBUG__)) {
          console.debug(message, entry.data || '');
        }
        break;
      case LogLevel.INFO:
        console.info(message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(message, entry.data || '', entry.stack || '' , entry.url || '' , entry.component || '' , entry.service || '' );
        break;
    }
  }

  /**
   * Sanitize data to prevent circular references
   */
  private sanitizeData(data: any, depth = 0): any {
    if (depth > 5) return '[Max Depth Reached]';
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;
    if (data instanceof Error) {
      return {
        name: data.name,
        message: data.message,
        stack: data.stack
      };
    }
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item, depth + 1));
    }
    
    const sanitized: any = {};
    try {
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          try {
            sanitized[key] = this.sanitizeData(data[key], depth + 1);
          } catch (e) {
            sanitized[key] = '[Error serializing]';
          }
        }
      }
    } catch (e) {
      return '[Error sanitizing object]';
    }
    return sanitized;
  }
}

