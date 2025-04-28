import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, of , from, throwError} from "rxjs";
import { EventList } from "../types/eventstype";
import { auth, db } from "../config/firebase.config";
import { collection, getDocs, onSnapshot, query, where, addDoc, increment, updateDoc } from 'firebase/firestore';
import { doc, getDoc } from "firebase/firestore";
import { catchError, map, tap } from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class EventsService {
  private eventsConlection = collection(db, "events");
  private eventsConlectionData: Observable<EventList[]>  = new Observable(observer =>{
    return onSnapshot(this.eventsConlection , (snapshot) =>{
      const events = snapshot.docs.map(doc =>({id: doc.id , ...doc.data()}))as unknown as EventList[];
      observer.next(events);
    }, error => observer.error( error))
  })


  

  private eventsSubject = new BehaviorSubject<EventList[]>([]);
  events$ = this.eventsSubject.asObservable();  

  constructor(private http: HttpClient) {}

  fetchEvents(): void {
    this.eventsConlectionData.subscribe(events =>{
      this.eventsSubject.next(events);
    })  
  }


  getAllEvents(): Observable<any[]> {
    const eventsCollectionRef = collection(db, 'events');
    return from(
      getDocs(eventsCollectionRef).then(snapshot => {
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
      })
    );
  }


  getEventById(eventId: string): Observable<EventList | undefined > {
    const eventDocRef = doc(db, 'events', eventId);
    return from(
      getDoc(eventDocRef).then(snapshot => {
        if (snapshot.exists()) {
          return { id: snapshot.id, ...snapshot.data() } as EventList; // Sử dụng snapshot.id làm ID
        } else {
          return undefined; 
        }
      })
    );
  }

  getEventsByOrganizer(userId: string): Observable<EventList[]>{
    const eventsDocRef = collection(db, 'events' );
    const qr = query(eventsDocRef, where('organizer.id' , '==' , userId) );

    return from(
      getDocs(qr).then(snapshot =>{
        const events: EventList[] = [];
        snapshot.forEach(doc =>{
          events.push({
            id: doc.id,
            ...doc.data() as EventList
          });
        });
        return events
      }).catch(error=>{
        console.error('error fetch', error);
        return []
      })
    )
  }

  addEvent(event: EventList): Observable<void> {
    const eventsCollectionRef = collection(db, 'events');
    const newEvent = {
      ...event,
      created_at: new Date(),
      updated_at: new Date(),
      status: 'published',
      attendees_count: 0,
      likes_count: 0
    };
    
    return from(
      addDoc(eventsCollectionRef, newEvent).then(() => {
        console.log('Event added successfully');
      }).catch(error => {
        console.error('Error adding event:', error);
        throw error;
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
    const eventDocRef = doc(this.eventsConlection, eventId);
    const change = isLiked ? 1 : -1;

    return from(updateDoc(eventDocRef, {likes_count: increment(change) }))
    .pipe(
      tap(()=> console.log('Event likes updated successfully')),
      catchError(error => {
        console.error('Error updating event likes:', error);
        return throwError(()=> error)
      }
    )    );
  }
}
