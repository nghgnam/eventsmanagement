import { HttpClient } from "@angular/common/http";
import { DestroyRef, inject, Injectable, signal } from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import { addDoc, collection, doc, getDoc, getDocs, increment, onSnapshot, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { forkJoin, from, Observable, of, throwError } from "rxjs";
import { catchError, map, tap } from "rxjs/operators";
import { db } from "../config/firebase.config";
import { EventList, EventStatus } from '../models/eventstype';

@Injectable({
  providedIn: 'root'
})
export class EventsService {
  private http = inject(HttpClient);

  private eventsConlection = collection(db, "events");
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventsSignal = signal<EventList[]>([]);
  readonly events$ = toObservable(this.eventsSignal.asReadonly());
  private eventsUnsubscribe?: () => void;

  constructor() {
    this.listenToEventsCollection();
    this.destroyRef.onDestroy(() => this.eventsUnsubscribe?.());
  }

  private listenToEventsCollection(forceRefresh = false): void {
    if (this.eventsUnsubscribe && !forceRefresh) {
      return;
    }
    this.eventsUnsubscribe?.();
    this.eventsUnsubscribe = onSnapshot(this.eventsConlection, snapshot => {
      const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EventList[];
      this.eventsSignal.set(events);
    }, error => console.error('Realtime events error:', error));
  }

  fetchEvents(forceRefresh = false): void {
    this.listenToEventsCollection(forceRefresh);
  }

  getAllEvents(): Observable<EventList[]> {
    const eventsCollectionRef = collection(db, 'events');
    return from(
      getDocs(eventsCollectionRef).then(snapshot => {
        const events = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as EventList[];
        this.eventsSignal.set(events);
        return events;
      })
    );
  }

  getEventById(eventId: string): Observable<EventList | undefined> {
    const eventDocRef = doc(db, 'events', eventId);
    return from(
      getDoc(eventDocRef).then(snapshot => {
        if (snapshot.exists()) {
          return { id: snapshot.id, ...snapshot.data() } as EventList;
        }
        return undefined;
      })
    );
  }

  getEventByListId(listEventId: string[]): Observable<EventList[]> {
    if (listEventId.length === 0 || !listEventId) {
      console.log('No event IDs provided');
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
    const eventsDocRef = collection(db, 'events');
    const qr = query(eventsDocRef, where('organizer.id', '==', userId));
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
    );
  }

  addEvent(event: EventList): Observable<void> {
    const eventsCollectionRef = collection(db, 'events');
    const payload = this.buildEventCreatePayload(event);
    
    return from(
      addDoc(eventsCollectionRef, payload).then(() => {
        console.log('Event added successfully');
        this.getAllEvents().subscribe(); // Refresh events list
      }).catch(error => {
        console.error('Error adding event:', error);
        throw error;
      })
    );
  }

  updateEvent(eventId: string, eventData: Partial<EventList>): Observable<void> {
    const eventRef = doc(db, 'events', eventId);
    const payload = this.buildEventUpdatePayload(eventData);
    payload['timeline.updatedAt'] = Timestamp.now();

    return from(
      /* eslint-disable @typescript-eslint/no-explicit-any */
      updateDoc(eventRef, payload as { [x: string]: any }).then(() => {
        this.getAllEvents().subscribe(); // Refresh events list
      })
    );
  }

  cancelEvent(eventId: string): Observable<void> {
    const eventRef = doc(db, 'events', eventId);
    return from(updateDoc(eventRef, {
      'status.state': 'cancelled',
      'status.deletedAt': Timestamp.now(),
      'timeline.updatedAt': Timestamp.now()
    })).pipe(
      tap(() => {
        console.log('Event cancelled successfully:', eventId);
      }),
      catchError(error => {
        console.error('Error cancelling event:', error);
        return throwError(() => new Error('Failed to cancel event'));
      })
    );
  }

  restoreEvent(eventId: string): Observable<void> {
    const eventRef = doc(db, 'events', eventId);
    return from(
      updateDoc(eventRef, {
        'status.state': 'published',
        'status.deletedAt': null,
        'timeline.updatedAt': Timestamp.now()
      }).then(() => {
        this.getAllEvents().subscribe(); // Refresh events list
      })
    );
  }

  getEventsByStatus(status: string): Observable<EventList[]> {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('status.state', '==', status));
    return from(
      getDocs(q).then(snapshot => {
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as EventList[];
      })
    );
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
    const eventDocRef = doc(this.eventsConlection, eventId);
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
    const now = Timestamp.now();
    return {
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
