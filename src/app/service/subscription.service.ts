import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, of , from} from "rxjs";
import { EventList } from "../types/eventstype";
import { auth, db } from "../config/firebase.config";
import { collection, getDocs, onSnapshot, query, where, addDoc, updateDoc, Timestamp, increment } from 'firebase/firestore';
import { doc, getDoc } from "firebase/firestore";
import { map } from "rxjs/operators";
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
  
  private eventSubscriptionsSubject = new BehaviorSubject<Subscriptions[]>([]);
  eventSubscriptions$ = this.eventSubscriptionsSubject.asObservable();

  private userSubscriptionsSubject = new BehaviorSubject<Subscriptions[]>([]);
  userSubscriptions$ = this.userSubscriptionsSubject.asObservable();

  private CurrentSubSubject = new BehaviorSubject<Subscriptions[]>([]);
  getCurrentSub$ = this.CurrentSubSubject.asObservable();

  private followSubject = new BehaviorSubject<Follows[]>([]);
  follows$ = this.followSubject.asObservable();

  private countFollowSubject = new BehaviorSubject<EventList[]>([]);
  countFollow$ = this.countFollowSubject.asObservable();

  private countAttendSubject = new BehaviorSubject<EventList[]>([]);
  countAttend$ = this.countAttendSubject.asObservable();


  getSubscriptionsByEvent(eventId: string): void{
    const q = query(this.subscriptionsCollection, where('event_id' , '==' , eventId), where('status' , '==' , 'active'))

    onSnapshot(q, (snapshot)=>{
      const subscriptions = snapshot.docs.map(doc => ({id: doc.id, ...doc.data})) as unknown as Subscriptions[];
      this.eventSubscriptionsSubject.next(subscriptions);
    }, error => {
      console.error("Lỗi khi fetch subscriptions:", error);
      this.eventSubscriptionsSubject.error(error);
    }
  )
  }

  getAllEventsHasSubscriptions(userId: string):void {
    const q =query(this.subscriptionsCollection, where('user_id', '==', userId))

    onSnapshot(q, (snapshot)=>{
      const subscriptions = snapshot.docs.map(doc => ({id: doc.id, ...doc.data})) as unknown as Subscriptions[];
      this.userSubscriptionsSubject.next(subscriptions);
    }, error => {
      console.error("Lỗi khi fetch subscriptions:", error);
      this.userSubscriptionsSubject.error(error);
    }
  )
  }



  getEventAndUserHasSubs(userId: string, eventId: string): void {
    const q =query(this.subscriptionsCollection, where('user_id', '==', userId), where('event_id' , '==' , eventId), where('status' , '==' , 'active'))

    onSnapshot(q, (snapshot)=>{
      const subscriptions = snapshot.docs.map(doc => ({id: doc.id, ...doc.data})) as unknown as Subscriptions[];
      this.CurrentSubSubject.next(subscriptions);
    }, error => {
      console.error("Lỗi khi fetch subscriptions:", error);
      this.CurrentSubSubject.error(error);
    }
  )
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
          status: data["status"] || '' // Đảm bảo status luôn có giá trị
        } as Follows;
      });

      this.followSubject.next(follows);
    }, error => {
      console.error('Error fetching follows:', error);
      this.followSubject.next([]); // Phát ra mảng rỗng nếu có lỗi
    });
  }

  addSubscibeAction(userId: string | undefined, eventId: string | undefined, start_date: string | undefined, end_date: string | undefined, price: number | null): Observable<void>{

    const q =query(this.subscriptionsCollection, where('user_id', '==', userId), where('event_id' , '==' , eventId))

    return from(
      getDocs(q).then(snapshot =>{
        if(snapshot.empty){
          
            addDoc(this.subscriptionsCollection, {
            user_id: userId,
            event_id: eventId,
            status: 'active',
            start_date: start_date,
            end_date: end_date,
            price: price
          }).then(() =>{
            this.updateAttendCount(eventId, 1);
            console.log('Subscribes succesful')
          }).catch(error =>{
            console.error('Error subscribe', error);
            throw error
          })
        
        }
        else {
          const docId = snapshot.docs[0].id;
          updateDoc(doc(this.subscriptionsCollection, docId), {
            status: 'inactive'
          }).then(() => {
            console.log('Unsubscribed successfully');
          });
        }
      })
      
    )
  }

  unsubscribeAction(userId: string | undefined, eventId: string | undefined): Observable<void> {
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
  
    return from(
      getDocs(q).then(snapshot => {
        if (!snapshot.empty) {
          const docId = snapshot.docs[0].id;
  
          
          return updateDoc(doc(this.subscriptionsCollection, docId), {
            status: 'inactive'
          }).then(() => {
            console.log('Unsubscribed successfully');
  
            
            this.getEventAndUserHasSubs(userId, eventId);
  
            
            return this.updateAttendCount(eventId, -1).toPromise();
          }).catch(error => {
            console.error('Error updating subscription status:', error);
            throw error; 
          });
        } else {
          console.warn('No active subscription found for the given user and event');
          return Promise.resolve(); 
        }
      }).catch(error => {
        console.error('Error fetching subscription for unsubscribe action:', error);
        throw error; 
      })
    );
  }

  addFollowAction(userId: string | undefined, organizerId: string | undefined, eventId: string | undefined): Observable<void> {
    if (!userId || !organizerId) {
      console.error('User ID or Organizer ID is undefined');
      return of(void 0); // Trả về Observable rỗng nếu tham số không hợp lệ
    }
  
    const q = query(this.followCollection, where('user_id', '==', userId), where('organizer_id', '==', organizerId));
  
    return from(
      getDocs(q).then(snapshot => {
        if (snapshot.empty) {
          
          return addDoc(this.followCollection, {
            user_id: userId,
            organizer_id: organizerId,
            status: 'active',
            follow_date: new Date()
          }).then(() => {
            console.log('Followed organizer');
            
            this.getUserAndOrganizer(userId, organizerId);
  
            
            if (eventId) {
              return this.updateFollowCount(eventId, 1).toPromise();
            }
            return Promise.resolve(); 
          }).catch(error => {
            console.error('Follow failed', error);
            throw error; 
          });
        } else {
          const docRef = snapshot.docs[0].ref;
          const currentStatus = snapshot.docs[0].data()["status"];
  
          
          const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
          const change = newStatus === 'active' ? 1 : -1;
  
          return updateDoc(docRef, {
            status: newStatus
          }).then(() => {
            console.log(`Follow status updated to ${newStatus}`);
            
            this.getUserAndOrganizer(userId, organizerId);
  
            
            if (eventId) {
              return this.updateFollowCount(eventId, change).toPromise();
            }
            return Promise.resolve(); 
          }).catch(error => {
            console.error('Error updating follow status:', error);
            throw error; 
          });
        }
      }).catch(error => {
        console.error('Error fetching follow data:', error);
        throw error; 
      })
    );
  }

  updateAttendCount(eventId: string | undefined, change: number): Observable<void> {
    if (!eventId) {
      console.error('Event ID is undefined');
      return of(void 0); 
    }
  
    const docRef = doc(this.eventsCollection, eventId); 
  
    return from(
      getDoc(docRef).then(snapshot => {
        if (snapshot.exists()) {
          return updateDoc(docRef, {
            attendees_count: increment(change)
          }).then(() => {
            console.log('Attend count updated successfully');
          }).catch(error => {
            console.error('Error updating attend count:', error);
            throw error;
          });
        } else {
          console.error('Event not found for updating attend count');
          return Promise.resolve();
        }
      }).catch(error => {
        console.error('Error fetching event for attend count update:', error);
        throw error;
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
            attendees_count: increment(change)
          }).then(() => {
            console.log('Follow count updated successfully');
          }).catch(error => {
            console.error('Error updating follow count:', error);
            throw error;
          });
        } else {
          console.error('Event not found for updating follow count');
          return Promise.resolve(); 
        }
      }).catch(error => {
        console.error('Error fetching event for follow count update:', error);
        throw error;
      })
    );
  }
}