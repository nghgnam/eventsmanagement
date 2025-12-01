import { HttpClient } from "@angular/common/http";
import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import { isPlatformBrowser } from "@angular/common";
import { addDoc, collection, doc, getDoc, getDocs, increment, onSnapshot, query, Timestamp, updateDoc, where, Firestore } from '@angular/fire/firestore';
import { forkJoin, from, Observable, of, throwError } from "rxjs";
import { catchError, map, tap } from "rxjs/operators";
import { EventList, EventStatus } from '../models/eventstype';

@Injectable({
  providedIn: 'root'
})
export class EventsService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private firestore = inject(Firestore); // Inject Firestore from AngularFire

  private eventsConlection: ReturnType<typeof collection> | null = null;
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventsSignal = signal<EventList[]>([]);
  readonly events$ = toObservable(this.eventsSignal.asReadonly());
  private eventsUnsubscribe?: () => void;
  
  // Retry mechanism
  private retryCount = 0;
  private readonly MAX_RETRIES = 10;
  private readonly INITIAL_RETRY_DELAY = 100; // ms
  private isInitializing = false;

  constructor() {
    // Don't initialize collection in constructor - use lazy initialization
    // This prevents errors when Firebase app hasn't been initialized yet
    this.destroyRef.onDestroy(() => this.eventsUnsubscribe?.());
    
    // Initialize collection lazily on browser after app is ready
    if (isPlatformBrowser(this.platformId)) {
      // Use setTimeout to ensure Firebase app is initialized first
      setTimeout(() => {
        this.initializeCollection();
      }, 500); // Increased delay to ensure Firebase providers are ready
    }
  }

  private initializeCollection(): void {
    if (!isPlatformBrowser(this.platformId) || this.isInitializing) {
      return;
    }
    
    if (this.eventsConlection) {
      this.retryCount = 0; // Reset retry count on successful initialization
      this.isInitializing = false;
      return;
    }

    this.isInitializing = true;
    
    if (this.retryCount >= this.MAX_RETRIES) {
      console.error('[EventsService] Max retries reached for Firestore collection initialization. Giving up.');
      this.isInitializing = false;
      return;
    }

    try {
      this.eventsConlection = collection(this.firestore, "events"); // Use injected firestore
      this.listenToEventsCollection();
      this.retryCount = 0;
      this.isInitializing = false;
    } catch (error:   unknown) {
      this.isInitializing = false;
      if (error instanceof Error && (error.message.includes('Firestore can only be accessed') || 
          error.message.includes('Expected first argument') ||
          error.message.includes('No Firebase App'))) {
        this.retryCount++;
        const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, this.retryCount - 1);
        console.warn(`[EventsService] Firebase not ready yet, retrying... (${this.retryCount}/${this.MAX_RETRIES}) - next retry in ${delay}ms`);
        setTimeout(() => this.initializeCollection(), delay);
      } else {
        console.error('[EventsService] Failed to initialize Firestore collection:', error);
      }
    }
  }

  private getEventsCollection() {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Firestore collection can only be accessed in browser environment');
    }
    if (!this.eventsConlection) {
      // Attempt to initialize if not already done
      this.initializeCollection();
      if (!this.eventsConlection) { // If still not initialized after attempt
        throw new Error('Firestore not ready yet, please retry');
      }
    }
    return this.eventsConlection;
  }

  private listenToEventsCollection(forceRefresh = false): void {
    // Double check platform before connecting to Firestore
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.eventsUnsubscribe && !forceRefresh) {
      return;
    }
    
    try {
      this.eventsUnsubscribe?.();
      const eventsCollection = this.getEventsCollection();
      
      // Add timeout for Firestore connection
      const connectionTimeout = setTimeout(() => {
        console.warn('[EventsService] Firestore connection timeout - unsubscribing');
        this.eventsUnsubscribe?.();
      }, 10000); // 10s timeout
      
      this.eventsUnsubscribe = onSnapshot(
        eventsCollection, 
        snapshot => {
          clearTimeout(connectionTimeout);
          const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EventList[];
          this.eventsSignal.set(events);
        }, 
        error => {
          clearTimeout(connectionTimeout);
          console.error('[EventsService] Realtime events error:', error);
          // Don't throw - allow app to continue
        }
      );
    } catch (error) {
      console.error('[EventsService] Failed to setup Firestore listener:', error);
      // Don't throw - allow service to work without realtime updates
    }
  }

  fetchEvents(forceRefresh = false): void {
    // Only fetch on browser, not during SSR
    if (isPlatformBrowser(this.platformId)) {
      this.listenToEventsCollection(forceRefresh);
    }
  }

  getAllEvents(): Observable<EventList[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return of([]);
    }
    
    try {
      const eventsCollectionRef = this.getEventsCollection(); // Use getter
      return from(
        getDocs(eventsCollectionRef).then(snapshot => {
          const events = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as EventList[];
          this.eventsSignal.set(events);
          return events;
        })
      ).pipe(
        catchError((error: unknown) => {
          if (error instanceof Error && (error.message.includes('Firestore can only be accessed') || 
              error.message.includes('Expected first argument') ||
              error.message.includes('Firestore not ready yet'))) {
            console.warn('[EventsService] Firestore not ready, returning empty array');
            return of([]);
          }
          console.error('[EventsService] Failed to fetch events:', error);
          return of([]);
        })
      );
    } catch (error: unknown) {
      if (error instanceof Error && (error.message.includes('Firestore can only be accessed') || 
          error.message.includes('Expected first argument') ||
          error.message.includes('Firestore not ready yet'))) {
        console.warn('[EventsService] Firestore not ready, returning empty array');
        return of([]);
      }
      console.error('[EventsService] Failed to fetch events:', error);
      return of([]);
    }
  }

  getEventById(eventId: string): Observable<EventList | undefined> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(undefined);
    }
    try {
      const eventDocRef = doc(this.firestore, 'events', eventId); // Use injected firestore
      return from(
        getDoc(eventDocRef).then(snapshot => {
          if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() } as EventList;
          }
          return undefined;
        })
      ).pipe(
        catchError((error: unknown) => {
          console.error('[EventsService] Error getting event by ID:', error);
          return of(undefined);
        })
      );
    } catch (error: unknown) {
      console.error('[EventsService] Failed to get event by ID:', error);
      return of(undefined);
    }
  }

  getEventByListId(listEventId: string[]): Observable<EventList[]> {
    if (listEventId.length === 0 || !listEventId || !isPlatformBrowser(this.platformId)) {
      return of([]);
    }

    const eventQueries = listEventId.map(id => this.getEventById(id));
    return forkJoin(eventQueries).pipe(
      map(events => events.filter(event => event !== undefined) as EventList[]),
      catchError(error => {
        console.error('Error fetching events:', error);
        return of([]);
      })
    );
  }

  getEventsByOrganizer(userId: string): Observable<EventList[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return of([]);
    }
    try {
      const eventsCollectionRef = collection(this.firestore, 'events'); // Use injected firestore
      const qr = query(eventsCollectionRef, where('organizer.id', '==', userId));
      return from(
        getDocs(qr).then(snapshot => {
          const events: EventList[] = [];
          snapshot.forEach(doc => {
            events.push({
              id: doc.id,
              ...doc.data() as EventList
            });
          });
          return events;
        }).catch(error => {
          console.error('error fetch', error);
          return [];
        })
      ).pipe(
        catchError(error => {
          console.error('[EventsService] Error getting events by organizer:', error);
          return of([]);
        })
      );
    } catch (error: unknown) {
      console.error('[EventsService] Failed to get events by organizer:', error);
      return of([]);
    }
  }

  addEvent(event: EventList): Observable<void> {    
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('[EventsService] Not in browser, returning empty observable');
      return of(undefined);
    }
    
    try {
      // Check if Firestore is available
      if (!this.firestore) {
        console.error('[EventsService] ❌ Firestore is not available');
        return throwError(() => new Error('Firestore is not initialized'));
      }
      
      let eventsCollectionRef;
      try {
        eventsCollectionRef = collection(this.firestore, 'events');
      } catch (collectionError) {
        console.error('[EventsService] ❌ Error creating collection:', collectionError);
        return throwError(() => new Error(`Failed to create collection: ${collectionError instanceof Error ? collectionError.message : 'Unknown error'}`));
      }
      
      let payload;
      try {
        payload = this.buildEventCreatePayload(event);
      } catch (payloadError) {
        console.error('[EventsService] ❌ Error building payload:', payloadError);
        return throwError(() => new Error(`Failed to build payload: ${payloadError instanceof Error ? payloadError.message : 'Unknown error'}`));
      }
      
      let addDocPromise;
      try {
        addDocPromise = addDoc(eventsCollectionRef, payload);
      } catch (addDocError) {
        console.error('[EventsService] ❌ Error creating addDoc promise:', addDocError);
        return throwError(() => new Error(`Failed to create addDoc promise: ${addDocError instanceof Error ? addDocError.message : 'Unknown error'}`));
      }
      
      return from(addDocPromise).pipe(
        map(() => {
          // Refresh events list (fire and forget)
          try {
            this.getAllEvents().subscribe({
              next: () => undefined,
              error: (err) => console.warn('[EventsService] Error refreshing events:', err)
            });
          } catch (refreshError) {
            console.warn('[EventsService] Error calling getAllEvents:', refreshError);
          }
        }),
        catchError((error) => {
          
          return throwError(() => {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            return new Error(`Failed to add event: ${errorMsg}`);
          });
        })
      );
    } catch (error: unknown) {
      console.error('[EventsService] ❌ Exception in addEvent try block:', error);
      return throwError(() => {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        return new Error(`Failed to add event: ${errorMsg}`);
      });
    }
  }

  updateEvent(eventId: string, eventData: Partial<EventList>): Observable<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(undefined);
    }
    try {
      const eventRef = doc(this.firestore, 'events', eventId); // Use injected firestore
      const payload = this.buildEventUpdatePayload(eventData);
      payload['timeline.updatedAt'] = Timestamp.now();

      return from(
        /* eslint-disable @typescript-eslint/no-explicit-any */
        updateDoc(eventRef, payload as any).then(() => {
          this.getAllEvents().subscribe(); // Refresh events list
        })
      ).pipe(
        catchError((error: unknown) => {
          console.error('[EventsService] Error updating event:', error);
          return throwError(() => new Error('Failed to update event'));
        })
      );
    } catch (error: unknown) {
      console.error('[EventsService] Failed to update event:', error);
      return throwError(() => new Error('Failed to update event'));
    }
  }

  cancelEvent(eventId: string): Observable<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(undefined);
    }
    try {
      const eventRef = doc(this.firestore, 'events', eventId); // Use injected firestore
      return from(updateDoc(eventRef, {
        'status.state': 'cancelled',
        'status.deletedAt': Timestamp.now(),
        'timeline.updatedAt': Timestamp.now()
      })).pipe(
        tap(() => {
          console.log('Event cancelled successfully:', eventId);
        }),
        catchError((error: unknown) => {
          console.error('Error cancelling event:', error);
          return throwError(() => new Error('Failed to cancel event'));
        })
      );
    } catch (error: unknown) {
      console.error('[EventsService] Failed to cancel event:', error);
      return throwError(() => new Error('Failed to cancel event'));
    }
  }

  restoreEvent(eventId: string): Observable<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(undefined);
    }
    try {
      const eventRef = doc(this.firestore, 'events', eventId); // Use injected firestore
      return from(
        updateDoc(eventRef, {
          'status.state': 'published',
          'status.deletedAt': null,
          'timeline.updatedAt': Timestamp.now()
        }).then(() => {
          this.getAllEvents().subscribe(); // Refresh events list
        })
      ).pipe(
        catchError(error => {
          console.error('[EventsService] Error restoring event:', error);
          return throwError(() => new Error('Failed to restore event'));
        })
      );
    } catch (error: any) {
      console.error('[EventsService] Failed to restore event:', error);
      return throwError(() => new Error('Failed to restore event'));
    }
  }

  getEventsByStatus(status: string): Observable<EventList[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return of([]);
    }
    try {
      const eventsRef = collection(this.firestore, 'events'); // Use injected firestore
      const q = query(eventsRef, where('status.state', '==', status));
      return from(
        getDocs(q).then(snapshot => {
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as EventList[];
        })
      ).pipe(
        catchError(error => {
          console.error('[EventsService] Error getting events by status:', error);
          return of([]);
        })
      );
    } catch (error: any) {
      console.error('[EventsService] Failed to get events by status:', error);
      return of([]);
    }
  }

  searchEvents(query: string) {
    if (!query) {
      return of([]);
    }

    const searchQuery = query.toLowerCase();
    return this.events$.pipe(
      map(events => events.filter(event => 
        event.core?.name?.toLowerCase().includes(searchQuery) ||
        event.core?.description?.toLowerCase().includes(searchQuery) ||
        event.organizer?.name?.toLowerCase().includes(searchQuery) ||
        (event.core?.tags && event.core.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery))) ||
        (event.location?.type === 'offline' && event.location?.address?.toLowerCase().includes(searchQuery))
      ))
    );
  }

  updateeventLikes(eventId: string, isLiked: boolean): Observable<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return throwError(() => new Error('Cannot update likes during SSR'));
    }
    const eventsCollection = this.getEventsCollection();
    const eventDocRef = doc(eventsCollection, eventId);
    const change = isLiked ? 1 : -1;

    return from(updateDoc(eventDocRef, { 'engagement.likesCount': increment(change) }))
      .pipe(
        tap(() => console.log('Event likes updated successfully')),
        catchError(error => {
          console.error('Error updating event likes:', error);
          return throwError(() => error);
        })
      );
  }

  private buildEventCreatePayload(event: EventList): Record<string, unknown> {
    console.log('[EventsService] buildEventCreatePayload called');
    const now = Timestamp.now();
    
    try {
      const payload = {
        ...event,
        core: {
          ...event.core,
          id: event.core?.id ?? event.id ?? ''
        },
        status: {
          visibility: (event.status as EventStatus)?.visibility ?? 'public',
          featured: (event.status as EventStatus)?.featured ?? false,
          state: (event.status as EventStatus)?.state ?? 'published',
          deletedAt: (event.status as EventStatus)?.deletedAt ?? null
        },
        engagement: {
          attendeesCount: event.engagement?.attendeesCount ?? 0,
          likesCount: event.engagement?.likesCount ?? 0,
          viewCount: event.engagement?.viewCount ?? 0,
          searchTerms: event.engagement?.searchTerms ?? []
        },
        timeline: {
          createdAt: now,
          updatedAt: now
        }
      };
      
      return payload;
    } catch (error) {
      console.error('[EventsService] ❌ Error building payload:', error);
      throw error;
    }
  }

  private buildEventUpdatePayload(event: Partial<EventList>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    if (event.core) {
      payload['core'] = { ...event.core };
    }
    if (event.status) {
      payload['status'] = {
        visibility: (event.status as EventStatus)?.visibility ?? 'public',
        featured: (event.status as EventStatus)?.featured ?? false,
        state: (event.status as EventStatus)?.state ?? 'published',
        deletedAt: (event.status as EventStatus)?.deletedAt ?? null
      };
    }
    if (event.media) {
      payload['media'] = { ...event.media };
    }
    if (event.schedule) {
      payload['schedule'] = { ...event.schedule };
    }
    if (event.location !== undefined) {
      payload['location'] = event.location;
    }
    if (event.organizer !== undefined) {
      payload['organizer'] = event.organizer;
    }
    if (event.tickets) {
      payload['tickets'] = { ...event.tickets };
    }
    if (event.engagement) {
      payload['engagement'] = {
        attendeesCount: event.engagement.attendeesCount ?? 0,
        likesCount: event.engagement.likesCount ?? 0,
        viewCount: event.engagement.viewCount ?? 0,
        searchTerms: event.engagement.searchTerms ?? []
      };
    }
    if (event.metadata) {
      payload['metadata'] = event.metadata;
    }
    return payload;
  }
}
