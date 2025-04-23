import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, of , from} from "rxjs";
import { EventList } from "../types/eventstype";
import { auth, db } from "../config/firebase.config";
import { collection, getDocs, onSnapshot, query, where, addDoc, updateDoc } from 'firebase/firestore';
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

  getUserAndOrganizer(userId: string | undefined, organizerId: string | undefined): void {
    const q =query(this.followCollection, where('user_id', '==', userId), where('organizer_id' , '==' , organizerId))

    onSnapshot(q, (snapshot)=>{
      const follows = snapshot.docs.map(doc => ({id: doc.id, ...doc.data})) as unknown as Follows[];
      this.followSubject.next(follows);
    }, error => {
      console.error("Lỗi khi fetch follows:", error);
      this.followSubject.error(error);
    }
  )
  }

  addSubscibeAction(userId: string | undefined, eventId: string | undefined): Observable<void>{

    const q =query(this.subscriptionsCollection, where('user_id', '==', userId), where('event_id' , '==' , eventId))

    return from(
      getDocs(q).then(snapshot =>{
        if(snapshot.empty){
          
            addDoc(this.subscriptionsCollection, {
            user_id: userId,
            event_id: eventId,
            status: 'active',
            start_date: new Date()
          }).then(() =>{
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

  addFollowAction(userId: string | undefined, organizerId: string | undefined): Observable<void> {
    if (!userId || !organizerId) {
      return of(void 0);
    }
    
    const q = query(this.followCollection, where('user_id', '==', userId), where('organizer_id', '==', organizerId));
  
    return from(
      getDocs(q).then(snapshot => {
        if (snapshot.empty) {
          // Chưa follow -> tạo mới
          return addDoc(this.followCollection, {
            user_id: userId,
            organizer_id: organizerId,
            status: 'active',
            follow_date: new Date()
          }).then(() => {
            console.log('Followed organizer');
            // Refresh the follows list
            this.getUserAndOrganizer(userId, organizerId);
          }).catch(error => {
            console.error('Follow failed', error);
            throw error;
          });
        } else {
          const docRef = snapshot.docs[0].ref;
          const currentStatus = snapshot.docs[0].data()["status"];
  
          // Nếu đã follow thì unfollow
          const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  
          return updateDoc(docRef, {
            status: newStatus
          }).then(() => {
            console.log(`Follow status updated to ${newStatus}`);
            // Refresh the follows list
            this.getUserAndOrganizer(userId, organizerId);
          });
        }
      })
    );
  }
  
}