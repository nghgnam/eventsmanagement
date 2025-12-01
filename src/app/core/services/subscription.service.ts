import { DestroyRef, Injectable, inject, PLATFORM_ID, signal } from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import { isPlatformBrowser } from "@angular/common";
import { DocumentData, Query, QuerySnapshot, Timestamp, addDoc, collection, doc, getDoc, getDocs, increment, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { Observable, from, of } from "rxjs";
import { catchError, distinctUntilChanged, map, switchMap, tap } from "rxjs/operators";
import { db } from "../config/firebase.config";
import { Follows } from '../models/followtype';
import { Subscriptions } from '../models/subscriptionstype';
@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private platformId = inject(PLATFORM_ID);
  private subscriptionsCollection: ReturnType<typeof collection> | null = null;
  private followCollection: ReturnType<typeof collection> | null = null;
  private eventsCollection: ReturnType<typeof collection> | null = null;
  private readonly destroyRef = inject(DestroyRef);
  private readonly listenerMap = new Map<string, () => void>();

  private getSubscriptionsCollection() {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Firestore collection can only be accessed in browser environment');
    }
    if (!this.subscriptionsCollection) {
      this.subscriptionsCollection = collection(db, "subscriptions");
    }
    return this.subscriptionsCollection;
  }

  private getFollowCollection() {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Firestore collection can only be accessed in browser environment');
    }
    if (!this.followCollection) {
      this.followCollection = collection(db, "follows");
    }
    return this.followCollection;
  }

  private getEventsCollection() {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Firestore collection can only be accessed in browser environment');
    }
    if (!this.eventsCollection) {
      this.eventsCollection = collection(db, "events");
    }
    return this.eventsCollection;
  }
  
  private readonly eventSubscriptionsSignal = signal<Subscriptions[]>([]);
  readonly eventSubscriptions$ = toObservable(this.eventSubscriptionsSignal.asReadonly());

  private readonly userSubscriptionsSignal = signal<Subscriptions[]>([]);
  readonly userSubscriptions$ = toObservable(this.userSubscriptionsSignal.asReadonly());

  private readonly currentSubscriptionsSignal = signal<Subscriptions[]>([]);
  readonly getCurrentSub$ = toObservable(this.currentSubscriptionsSignal.asReadonly()).pipe(
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
  );

  private readonly followSignal = signal<Follows[]>([]);
  readonly follows$ = toObservable(this.followSignal.asReadonly());

  constructor() {
    this.destroyRef.onDestroy(() => this.clearAllListeners());
  }


  getSubscriptionsByEvent(eventId: string): void {
    if (!eventId) {
      console.error('Event ID is undefined');
      this.eventSubscriptionsSignal.set([]);
      this.unregisterListener(`event:${eventId}`);
      return;
    }
  
    if (!isPlatformBrowser(this.platformId)) {
      this.eventSubscriptionsSignal.set([]);
      return;
    }
    const q = query(
      this.getSubscriptionsCollection(),
      where('eventId', '==', eventId),
      where('status', '==', 'active')
    );
  
    this.registerListener(
      `event:${eventId}`,
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const subscriptions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Subscriptions[];
        this.eventSubscriptionsSignal.set(subscriptions);
      },
      (error: unknown) => {
        console.error('Error fetching subscriptions:', error);
        this.eventSubscriptionsSignal.set([]);
      }
    );
  }

  getAllEventsHasSubscriptions(userId: string): void {
    if (!userId) {
      console.error('User ID is undefined');
      this.userSubscriptionsSignal.set([]);
      this.unregisterListener(`user:${userId}`);
      return;
    }
  
    if (!isPlatformBrowser(this.platformId)) {
      this.userSubscriptionsSignal.set([]);
      return;
    }
    const q = query(this.getSubscriptionsCollection(), where('userId', '==', userId));
  
    this.registerListener(
      `user:${userId}`,
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const subscriptions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Subscriptions[];
        this.userSubscriptionsSignal.set(subscriptions);
      },
      (error: unknown) => {
        console.error('Error fetching subscriptions:', error);
        this.userSubscriptionsSignal.set([]);
      }
    );
  }



  getEventAndUserHasSubs(userId: string, eventId: string): void {
    const q = query(
      this.getSubscriptionsCollection(),
      where('userId', '==', userId),
      where('eventId', '==', eventId),
      where('status', '==', 'active')
    );
  
    getDocs(q)
      .then(snapshot => {
        const subscriptions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Subscriptions));
        this.currentSubscriptionsSignal.set(subscriptions);
      })
      .catch(error => {
        console.error('Error fetching subscriptions:', error);
        this.currentSubscriptionsSignal.set([]);
      });
  }

  getUserAndOrganizer(userId: string, organizerId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.followSignal.set([]);
      return;
    }
    const q = query(this.getFollowCollection(), where('userId', '==', userId), where('organizerId', '==', organizerId));
    const key = `follow:${userId}:${organizerId}`;
    this.registerListener(
      key,
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const follows = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data["userId"] || undefined,
            organizerId: data["organizerId"] || undefined,
            relationship: data["relationship"] || { status: '' },
            metadata: data["metadata"] || {},
            timestamps: data["timestamps"] || { followedAt: null, updatedAt: null }
          } as Follows;
        });
        this.followSignal.set(follows);
      },
      error => {
        console.error('Error fetching follows:', error);
        this.followSignal.set([]);
      }
    );
  }

  addSubscription(userId: string, eventId: string, start_date: string, end_date: string, price: number): Observable<void> {
    const payload = {
      userId,
      eventId,
      status: 'active',
      billing: {
        price,
        currency: 'VND',
        plan: null
      },
      period: {
        start: start_date,
        end: end_date
      },
      metadata: {},
      timestamps: {
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
    };
    if (!isPlatformBrowser(this.platformId)) {
      return of(void 0);
    }
    return from(
      addDoc(this.getSubscriptionsCollection(), payload)
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
      this.getSubscriptionsCollection(),
      where('userId', '==', userId),
      where('eventId', '==', eventId)
    );
  
    return from(getDocs(q)).pipe(
      switchMap(snapshot => {
        if (!snapshot.empty) {
          const docId = snapshot.docs[0].id;
          const currentStatus = snapshot.docs[0].data()["status"];
          const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  
          if (!isPlatformBrowser(this.platformId)) {
            return of(void 0);
          }
          return from(
            updateDoc(doc(this.getSubscriptionsCollection(), docId), { status: newStatus })
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
      this.getSubscriptionsCollection(),
      where('userId', '==', userId),
      where('eventId', '==', eventId),
      where('status', '==', 'active')
    );
  
    return from(getDocs(q)).pipe(
      switchMap(snapshot => {
        if (!snapshot.empty) {
          // const docId = snapshot.docs[0].id;
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
          this.currentSubscriptionsSignal.set([]);
          this.currentSubscriptionsSignal.set([]);
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
    if (!isPlatformBrowser(this.platformId)) {
      return of(void 0);
    }
    if (!userId || !organizerId) {
      console.error('User ID or Organizer ID is undefined');
      return of(void 0);
    }
  
    const q = query(
      this.getFollowCollection(),
      where('userId', '==', userId),
      where('organizerId', '==', organizerId)
    );
  
    return from(getDocs(q)).pipe(
      switchMap(snapshot => {
        if (snapshot.empty) {
          // Nếu không có document, thêm mới
          return from(
            addDoc(this.getFollowCollection(), {
              userId,
              organizerId,
              relationship: { status: 'active' },
              metadata: { eventId: eventId ?? null },
              timestamps: {
                followedAt: Timestamp.now(),
                updatedAt: Timestamp.now()
              }
            })
          ).pipe(
            map(() => void 0), 
            tap(() => console.log('Followed organizer successfully'))
          );
        } else {
          // Nếu đã tồn tại, cập nhật trạng thái
          const docRef = snapshot.docs[0].ref;
          return from(
            updateDoc(docRef, { 'relationship.status': 'active', 'timestamps.updatedAt': Timestamp.now() })
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
    if (!isPlatformBrowser(this.platformId)) {
      return of(false);
    }
    const q = query(
      this.getFollowCollection(),
      where('userId', '==', userId),
      where('organizerId', '==', organizerId),
      where('relationship.status', '==', 'active')
    );
  
    return from(getDocs(q)).pipe(
      map(snapshot => !snapshot.empty), // Trả về true nếu đã follow
      catchError(error => {
        console.error('Error checking follow status:', error);
        return of(false); // Trả về false nếu có lỗi
      })
    );
  }
  
  toggleFollowStatus(userId: string, organizerId: string): Observable<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(void 0);
    }
    if (!userId || !organizerId) {
      console.error('User ID or Organizer ID is undefined');
      return of(void 0);
    }
  
    const q = query(
      this.getFollowCollection(),
      where('userId', '==', userId),
      where('organizerId', '==', organizerId)
    );
  
    return from(getDocs(q)).pipe(
      switchMap(snapshot => {
        if (!snapshot.empty) {
          const docRef = snapshot.docs[0].ref;
          const currentStatus = snapshot.docs[0].data()["relationship"]?.status;
          const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  
          return from(
            updateDoc(docRef, { 'relationship.status': newStatus, 'timestamps.updatedAt': Timestamp.now() })
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
    if (!isPlatformBrowser(this.platformId)) {
      return of(void 0);
    }
    if (!eventId) {
      console.error('Event ID is undefined');
      return of(void 0);
    }
  
    const docRef = doc(this.getEventsCollection(), eventId);
  
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
    if (!isPlatformBrowser(this.platformId)) {
      return of(void 0);
    }
    if (!eventId) {
      console.error('Event ID is undefined');
      return of(void 0);
    }
  
    const docRef = doc(this.getEventsCollection(), eventId);
  
    return from(
      updateDoc(docRef, {
        'engagement.attendeesCount': increment(change)
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
    if (!isPlatformBrowser(this.platformId)) {
      return of(0);
    }
    if (!userId || !organizerId) {
      console.error('Invalid parameters: userId or organizerId is undefined');
      return of(0); 
    }
  
    const q = query(
      this.getFollowCollection(),
      where('organizerId', '==', organizerId),
      where('relationship.status', '==', 'active')
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
    if (!isPlatformBrowser(this.platformId)) {
      return of(0);
    }
    if (!eventId) {
      console.error('Event ID is undefined');
      return of(-1); // Trả về -1 nếu eventId không hợp lệ
    }
  
    const q = query(
      this.getSubscriptionsCollection(),
      where('eventId', '==', eventId),
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
    if (!isPlatformBrowser(this.platformId)) {
      return of(false);
    }
    if (!eventId) {
      console.error('Event ID is undefined');
      return of(false);
    }
    const docRef = doc(this.getEventsCollection(), eventId);
  
    return from(getDoc(docRef)).pipe(
      map(snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data() as { engagement?: { attendeesCount?: number }; tickets?: { maxAttendees?: number; capacity?: number } };
          const attendeesCount = data['engagement']?.attendeesCount ?? 0;
          const maxAttendees = data['tickets']?.maxAttendees ?? data['tickets']?.capacity ?? 0;
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
  
  private registerListener(
    key: string,
    queryRef: Query<DocumentData, DocumentData>,
    onSnapshotSuccess: (snapshot: QuerySnapshot<DocumentData>) => void,
    onSnapshotError?: (error: unknown) => void
  ): void {
    this.unregisterListener(key);
    const unsubscribe = onSnapshot(queryRef, (snapshot: QuerySnapshot<DocumentData>) => onSnapshotSuccess(snapshot), (error: unknown) => {
      onSnapshotError ? onSnapshotError(error) : console.error('Realtime listener error:', error);
    });
    this.listenerMap.set(key, unsubscribe);
  }

  private unregisterListener(key: string): void {
    const unsubscribe = this.listenerMap.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.listenerMap.delete(key);
    }
  }

  private clearAllListeners(): void {
    this.listenerMap.forEach(unsub => unsub());
    this.listenerMap.clear();
  }
}