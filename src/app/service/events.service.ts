import { inject, Injectable } from "@angular/core";
import { addDoc, collection, CollectionReference, doc, Firestore, getDoc, getDocs, increment, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { BehaviorSubject, forkJoin, from, Observable, of, throwError } from "rxjs";
import { catchError, map, tap } from "rxjs/operators";
import { db } from "../config/firebase.config";
import { EventList } from "../core/models/eventstype";

@Injectable({
  providedIn: 'root'
})
export class EventsService{
  private firestore = inject(Firestore);
  private eventsConlection: CollectionReference | undefined;
  private eventsSubject = new BehaviorSubject<EventList[]>([]);
  events$ = this.eventsSubject.asObservable();


  constructor() {
    if(this.firestore){
      this.eventsConlection = collection(this.firestore, 'events');
    } 
  }

  fetchEvents(): void {
    this.getAllEvents().subscribe({
      error: (error) => console.error('Failed to fetch events:', error)
    });
  }

  getAllEvents(): Observable<EventList[]> {
    const eventsCollectionRef = collection(db, 'events');
    return from(
      getDocs(eventsCollectionRef).then(snapshot => {
        const events = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as EventList[];
        this.eventsSubject.next(events);
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
    const newEvent = {
      ...event,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      status: 'published',
      attendees_count: 0,
      likes_count: 0
    };
    
    return from(
      addDoc(eventsCollectionRef, newEvent).then(() => {
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
    return from(
      updateDoc(eventRef, {
        ...eventData,
        updated_at: Timestamp.now()
      }).then(() => {
        this.getAllEvents().subscribe(); // Refresh events list
      })
    );
  }

  cancelEvent(eventId: string): Observable<void> {
    const eventRef = doc(db, 'events', eventId);
    return from(updateDoc(eventRef, {
      status: 'cancelled',
      updated_at: Timestamp.now(),
      deleted_at: Timestamp.now()
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
        status: 'published',
        updated_at: Timestamp.now()
      }).then(() => {
        this.getAllEvents().subscribe(); // Refresh events list
      })
    );
  }

  getEventsByStatus(status: string): Observable<EventList[]> {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('status', '==', status));
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
        event.name?.toLowerCase().includes(searchQuery) ||
        event.description?.toLowerCase().includes(searchQuery) ||
        event.organizer?.name?.toLowerCase().includes(searchQuery) ||
        (event.tags && event.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery))) ||
        (event.location?.type === 'offline' && event.location?.address?.toLowerCase().includes(searchQuery))
      ))
    );
  }

  updateeventLikes(eventId: string, isLiked: boolean): Observable<void> {
    if(!this.eventsConlection){
      return of(undefined);
    }
    const eventDocRef = doc(this.eventsConlection as CollectionReference, eventId);
    const change = isLiked ? 1 : -1;

    return from(updateDoc(eventDocRef, { likes_count: increment(change) }))
      .pipe(
        tap(() => console.log('Event likes updated successfully')),
        catchError(error => {
          console.error('Error updating event likes:', error);
          return throwError(() => error);
        })
      );
  }
}
