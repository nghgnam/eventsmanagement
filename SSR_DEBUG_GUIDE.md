# HƯỚNG DẪN DEBUG SSR TIMEOUT

## 🚀 SỬ DỤNG SSR LOGGER

### 1. **Enable Logging trong Component**

```typescript
import { SSRLoggerService } from '@core/services/ssr-logger.service';

export class YourComponent implements OnInit {
  private logger = inject(SSRLoggerService);

  ngOnInit() {
    this.logger.startTimer('component-init');
    
    // Your code here
    
    this.logger.endTimer('component-init', 'Component initialized', 'YourComponent');
  }
}
```

### 2. **Log Firebase Operations**

```typescript
try {
  this.logger.logFirebaseOperation('fetchEvents', true, undefined, 'ComponentName', 'EventsService');
  // Firebase operation
} catch (error) {
  this.logger.logFirebaseOperation('fetchEvents', false, error, 'ComponentName', 'EventsService');
}
```

### 3. **Log HTTP Requests**

HTTP requests sẽ tự động được log bởi `ssrLoggingInterceptor`.

### 4. **Export Logs để Debug**

```typescript
// Trong browser console hoặc server logs
const logger = inject(SSRLoggerService);
const logs = logger.exportLogs();
console.log(logs);

// Hoặc xem summary
const summary = logger.getSummary();
console.table(summary.byLevel);
console.log('Errors:', summary.errors);
console.log('Performance:', Array.from(summary.performance.entries()));
```

---

## 🔍 DEBUGGING STEPS

### Step 1: Enable SSR Logging

Set environment variable:
```bash
# Windows PowerShell
$env:SSR_LOGGING="true"
$env:SSR_TIMEOUT="30000"

# Linux/Mac
export SSR_LOGGING=true
export SSR_TIMEOUT=30000
```

### Step 2: Check Server Logs

Khi SSR timeout, check server console logs:
```
[SSR] [2024-01-01T00:00:00.000Z] [ERROR] SSR TIMEOUT - Rendering took longer than 30000ms
```

### Step 3: Identify Slow Operations

Look for:
- Long duration timers
- Multiple Firestore connections
- HTTP requests taking too long
- Components taking > 100ms to initialize

### Step 4: Check Performance Metrics

```typescript
const metrics = logger.getPerformanceMetrics();
// Look for operations taking > 1s
```

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue 1: Firestore Connection Timeout

**Symptoms:**
- `[EventsService] Firestore connection timeout`
- SSR timeout after 10s

**Solution:**
- Check Firebase configuration
- Ensure Firestore rules allow read access
- Check network connectivity

### Issue 2: HTTP Request Timeout

**Symptoms:**
- HTTP requests hanging
- `AddressInformationService` requests timeout

**Solution:**
- Check if assets are accessible
- Verify `isPlatformBrowser` checks
- Add timeout to HTTP requests

### Issue 3: Component Initialization Slow

**Symptoms:**
- Component init timer > 100ms
- Multiple subscriptions in ngOnInit

**Solution:**
- Defer heavy operations
- Use `afterNextRender` for browser-only code
- Split initialization logic

---

## 📊 MONITORING METRICS

### Key Metrics to Watch:

1. **SSR Rendering Time** - Should be < 2s
2. **Firestore Connection** - Should be < 1s
3. **HTTP Request Time** - Should be < 500ms
4. **Component Init** - Should be < 100ms per component

### Performance Thresholds:

- ✅ **Good**: < 1s total SSR time
- ⚠️ **Warning**: 1-3s total SSR time
- 🔴 **Critical**: > 3s total SSR time

---

## 🛠️ TROUBLESHOOTING COMMANDS

### Check SSR Logs:
```bash
# Run dev server with logging
npm start

# Check for timeout errors in console
# Look for: [SSR] [ERROR] SSR TIMEOUT
```

### Export Logs:
```typescript
// In browser console
(window as any).__SSR_LOGS__ = logger.exportLogs();
console.log((window as any).__SSR_LOGS__);
```

### Monitor Performance:
```typescript
// Check performance metrics
const metrics = logger.getPerformanceMetrics();
console.table(Array.from(metrics.entries()));
```

---

## 📝 CHECKLIST KHI GẶP TIMEOUT

- [ ] Check server logs for error messages
- [ ] Verify Firestore connections are SSR-safe
- [ ] Check HTTP requests are not blocking
- [ ] Review component initialization times
- [ ] Check for memory leaks
- [ ] Verify all platform checks are correct
- [ ] Export and analyze logs
- [ ] Check performance metrics

---

**Last Updated:** $(date)

