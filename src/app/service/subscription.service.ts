import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, of , from} from "rxjs";
import { EventList } from "../types/eventstype";
import { auth, db } from "../config/firebase.config";
import { collection, getDocs, onSnapshot, query, where, addDoc, updateDoc, Timestamp, increment } from 'firebase/firestore';
import { doc, getDoc } from "firebase/firestore";
import { catchError, distinctUntilChanged, map, switchMap, tap } from "rxjs/operators";
import { Subscriptions } from "../types/subscriptionstype";
import { Follows } from "../types/followtype";
@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private subscriptionsCollection = collection(db, "subscriptions");
  private followCollection = collection(db, "follows");
  private eventsCollection = collection(db, "events");
  // private subscriptionsCollectionData: Observable<Subscriptions[]> = new Observable(observer =>{
  //   return onSnapshot(this.subscriptionsCollection, (snapshot) =>{
  //     const subscriptions = snapshot.docs.map(doc => ({id: doc.id, ...doc.data})) as unknown as Subscriptions[];
  //     observer.next(subscriptions);
  //   }, error => observer.error( error))
  // })
  
  private readonly eventSubscriptionsSubject = new BehaviorSubject<Subscriptions[]>([]);
  readonly eventSubscriptions$ = this.eventSubscriptionsSubject.asObservable();

  private readonly userSubscriptionsSubject = new BehaviorSubject<Subscriptions[]>([]);
  readonly userSubscriptions$ = this.userSubscriptionsSubject.asObservable();

  private readonly CurrentSubSubject = new BehaviorSubject<Subscriptions[]>([]);
  readonly getCurrentSub$ = this.CurrentSubSubject.asObservable().pipe(
  distinctUntilChanged((prev, curr) => 
    JSON.stringify(prev) === JSON.stringify(curr)
  )
  );

  private readonly followSubject = new BehaviorSubject<Follows[]>([]);
  readonly follows$ = this.followSubject.asObservable();

  private readonly countFollowSubject = new BehaviorSubject<EventList[]>([]);
  readonly countFollow$ = this.countFollowSubject.asObservable();

  private readonly countAttendSubject = new BehaviorSubject<EventList[]>([]);
  readonly countAttend$ = this.countAttendSubject.asObservable();


  getSubscriptionsByEvent(eventId: string): void {
    if (!eventId) {
      console.error('Event ID is undefined');
      this.eventSubscriptionsSubject.next([]); 
      return;
    }
  
    const q = query(
      this.subscriptionsCollection,
      where('event_id', '==', eventId),
      where('status', '==', 'active')
    );
  
    onSnapshot(q, (snapshot) => {
      const subscriptions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as unknown as Subscriptions[];
      this.eventSubscriptionsSubject.next(subscriptions);
    }, error => {
      console.error('Error fetching subscriptions:', error);
      this.eventSubscriptionsSubject.error(error);
    });
  }

  getAllEventsHasSubscriptions(userId: string): void {
    if (!userId) {
      console.error('User ID is undefined');
      this.userSubscriptionsSubject.next([]); 
      return;
    }
  
    const q = query(this.subscriptionsCollection, where('user_id', '==', userId));
  
    onSnapshot(q, (snapshot) => {
      const subscriptions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as unknown as Subscriptions[];
      this.userSubscriptionsSubject.next(subscriptions);
    }, error => {
      console.error('Error fetching subscriptions:', error);
      this.userSubscriptionsSubject.error(error);
    });
  }



  getEventAndUserHasSubs(userId: string, eventId: string): void {
    const q = query(
      this.subscriptionsCollection,
      where('user_id', '==', userId),
      where('event_id', '==', eventId),
      where('status', '==', 'active')
    );
  
    from(getDocs(q).then(snapshot => {
      try {
        const subscriptions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as unknown as Subscriptions));
        console.log('Found subscriptions:', subscriptions);
        this.CurrentSubSubject.next(subscriptions);
      } catch (error) {
        console.error('Error processing subscription data:', error);
        this.CurrentSubSubject.next([]);
      }
    }).catch(error => {
      console.error('Error fetching subscriptions:', error);
      this.CurrentSubSubject.next([]);
    }));
  }

  getUserAndOrganizer(userId: string, organizerId: string): void {
    const q = query(this.followCollection, where('user_id', '==', userId), where('organizer_id', '==', organizerId));
    onSnapshot(q, (snapshot) => {
      const follows = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          user_id: data["user_id"] || undefined,
          organizer_id: data["organizer_id"] || undefined,
          status: data["status"] || '' 
        } as Follows;
      });

      this.followSubject.next(follows);
    }, error => {
      console.error('Error fetching follows:', error);
      this.followSubject.next([]); 
    });
  }

  addSubscription(userId: string, eventId: string, start_date: string, end_date: string, price: number): Observable<void> {
    return from(
      addDoc(this.subscriptionsCollection, {
        user_id: userId,
        event_id: eventId,
        status: 'active',
        start_date: start_date,
        end_date: end_date,
        price: price
      })
    ).pipe(
      map(() => void 0), 
      tap(() => {
        console.log('Subscribed successfully');
        this.getEventAndUserHasSubs(userId, eventId);
      }),
      catchError(error => {
        console.error('Error adding subscription:', error);
        return of(void 0);
      })
    );
  }
  
  toggleSubscriptionStatus(userId: string, eventId: string): Observable<void> {
    const q = query(
      this.subscriptionsCollection,
      where('user_id', '==', userId),
      where('event_id', '==', eventId)
    );
  
    return from(getDocs(q)).pipe(
      switchMap(snapshot => {
        if (!snapshot.empty) {
          const docId = snapshot.docs[0].id;
          const currentStatus = snapshot.docs[0].data()["status"];
          const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  
          return from(
            updateDoc(doc(this.subscriptionsCollection, docId), { status: newStatus })
          ).pipe(
            tap(() => {
              console.log(`Subscription status updated to ${newStatus}`);
              this.getEventAndUserHasSubs(userId, eventId);
            })
          );
        }
        return of(void 0);
      }),
      catchError(error => {
        console.error('Error toggling subscription status:', error);
        return of(void 0);
      })
    );
  }

  unsubscribeAction(userId: string, eventId: string): Observable<void> {
    if (!userId || !eventId) {
      console.error('User ID or Event ID is undefined');
      return of(void 0);
    }
  
    const q = query(
      this.subscriptionsCollection,
      where('user_id', '==', userId),
      where('event_id', '==', eventId),
      where('status', '==', 'active')
    );
  
    return from(getDocs(q)).pipe(
      switchMap(snapshot => {
        if (!snapshot.empty) {
          const docId = snapshot.docs[0].id;
          const docRef = snapshot.docs[0].ref;
  
          return from(
            updateDoc(docRef, { status: 'inactive' })
          ).pipe(
            tap(() => {
              console.log('Unsubscribed successfully');
              this.getEventAndUserHasSubs(userId, eventId);
            })
          );
        } else {
          console.warn('No active subscription found');
          this.CurrentSubSubject.next([]);
          return of(void 0);
        }
      }),
      catchError(error => {
        console.error('Error in unsubscribe action:', error);
        return of(void 0);
      })
    );
  }

  addFollow(userId: string, organizerId: string, eventId?: string): Observable<void> {
    if (!userId || !organizerId) {
      console.error('User ID or Organizer ID is undefined');
      return of(void 0);
    }
  
    const q = query(
      this.followCollection,
      where('user_id', '==', userId),
      where('organizer_id', '==', organizerId)
    );
  
    return from(getDocs(q)).pipe(
      switchMap(snapshot => {
        if (snapshot.empty) {
          // Nếu không có document, thêm mới
          return from(
            addDoc(this.followCollection, {
              user_id: userId,
              organizer_id: organizerId,
              status: 'active',
              follow_date: new Date()
            })
          ).pipe(
            map(() => void 0), 
            tap(() => console.log('Followed organizer successfully'))
          );
        } else {
          // Nếu đã tồn tại, cập nhật trạng thái
          const docRef = snapshot.docs[0].ref;
          return from(
            updateDoc(docRef, { status: 'active' })
          ).pipe(
            tap(() => console.log('Updated follow status to active'))
          );
        }
      }),
      catchError(error => {
        console.error('Error in addFollow:', error);
        return of(void 0);
      })
    );
  }

  
  checkFollowStatus(userId: string, organizerId: string): Observable<boolean> {
    const q = query(
      this.followCollection,
      where('user_id', '==', userId),
      where('organizer_id', '==', organizerId),
      where('status', '==', 'active')
    );
  
    return from(getDocs(q)).pipe(
      map(snapshot => !snapshot.empty), // Trả về true nếu đã follow
      catchError(error => {
        console.error('Error checking follow status:', error);
        return of(false); // Trả về false nếu có lỗi
      })
    );
  }
  
  toggleFollowStatus(userId: string, organizerId: string, eventId?: string): Observable<void> {
    if (!userId || !organizerId) {
      console.error('User ID or Organizer ID is undefined');
      return of(void 0);
    }
  
    const q = query(
      this.followCollection,
      where('user_id', '==', userId),
      where('organizer_id', '==', organizerId)
    );
  
    return from(getDocs(q)).pipe(
      switchMap(snapshot => {
        if (!snapshot.empty) {
          const docRef = snapshot.docs[0].ref;
          const currentStatus = snapshot.docs[0].data()["status"];
          const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  
          return from(
            updateDoc(docRef, { status: newStatus })
          ).pipe(
            tap(() => console.log(`Follow status updated to ${newStatus}`))
          );
        } else {
          console.warn('No follow relationship found');
          return of(void 0);
        }
      }),
      catchError(error => {
        console.error('Error toggling follow status:', error);
        return of(void 0);
      })
    );
  }
  updateFollowCount(eventId: string | undefined, change: number): Observable<void> {
    if (!eventId) {
      console.error('Event ID is undefined');
      return of(void 0);
    }
  
    const docRef = doc(this.eventsCollection, eventId);
  
    return from(
      getDoc(docRef).then(snapshot => {
        if (snapshot.exists()) {
          return updateDoc(docRef, {
            'organizer.followers': increment(change)
          }).then(() => {
            console.log('Organizer follower count updated successfully');
          });
        } else {
          console.error('Event not found for updating follower count');
          return Promise.resolve();
        }
      })
    ).pipe(
      catchError(error => {
        console.error('Error in updateFollowCount:', error);
        return of(void 0);
      })
    );
  }

  updateAttendeeCount(eventId: string, change: number): Observable<void> {
    if (!eventId) {
      console.error('Event ID is undefined');
      return of(void 0);
    }
  
    const docRef = doc(this.eventsCollection, eventId);
  
    return from(
      updateDoc(docRef, {
        attendees_count: increment(change)
      })
    ).pipe(
      tap(() => console.log(`Attendees count updated by ${change}`)),
      catchError(error => {
        console.error('Error updating attendees count:', error);
        return of(void 0);
      })
    );
  }

  getAllFollower(userId: string, organizerId: string): Observable<number> {
    if (!userId || !organizerId) {
      console.error('Invalid parameters: userId or organizerId is undefined');
      return of(0); 
    }
  
    const q = query(
      this.followCollection,
      where('organizer_id', '==', organizerId),
      where('status', '==', 'active')
    );
  
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const followerCount = snapshot.size;
        console.log(`Total followers for organizer ${organizerId}:`, followerCount);
        return followerCount;
      }),
      catchError(error => {
        console.error('Error fetching followers:', error);
        return of(0);
      })
    );
  }


  getSubscriberCount(eventId: string): Observable<number> {
    if (!eventId) {
      console.error('Event ID is undefined');
      return of(-1); // Trả về -1 nếu eventId không hợp lệ
    }
  
    const q = query(
      this.subscriptionsCollection,
      where('event_id', '==', eventId),
      where('status', '==', 'active') // Chỉ lấy những người đăng ký có trạng thái active
    );
  
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const subscriberCount = snapshot.size; // Lấy tổng số tài liệu
        console.log(`Total subscribers for event ${eventId}:`, subscriberCount);
        return subscriberCount;
      }),
      catchError(error => {
        console.error('Error fetching subscriber count:', error);
        return of(-1); // Trả về -1 nếu có lỗi
      })
    );
  }
  checkEventFull(eventId: string): Observable<boolean> {
    if (!eventId) {
      console.error('Event ID is undefined');
      return of(false);
    }
  
    const docRef = doc(this.eventsCollection, eventId);
  
    return from(getDoc(docRef)).pipe(
      map(snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const attendeesCount = data['attendees_count'] || 0;
          const maxAttendees = data['max_attendees'] || 0;
          return attendeesCount >= maxAttendees; // Trả về true nếu đã đủ người tham dự
        } else {
          console.error('Event not found');
          return false;
        }
      }),
      catchError(error => {
        console.error('Error checking event full status:', error);
        return of(false);
      })
    );
  }
  

  
}