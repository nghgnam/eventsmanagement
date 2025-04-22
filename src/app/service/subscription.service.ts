import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, of , from} from "rxjs";
import { EventList } from "../types/eventstype";
import { auth, db } from "../config/firebase.config";
import { collection, getDocs, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { doc, getDoc } from "firebase/firestore";
import { map } from "rxjs/operators";
import { Subscriptions } from "../types/subscriptionstype";
@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private subscriptionsCollection = collection(db, "subscriptions");
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
}