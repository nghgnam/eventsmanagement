import { Injectable } from '@angular/core';
import { auth } from '../config/firebase.config';
import { Observable, of, from, BehaviorSubject, forkJoin } from 'rxjs';
import { TicketType } from '../types/ticketstype';
import { addDoc, collection, getDocs, onSnapshot, query, Timestamp, where } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { catchError, debounceTime, map, switchMap, tap } from 'rxjs/operators';
import { db } from '../config/firebase.config';
import { error } from 'console';
@Injectable({
    providedIn: 'root'
})

export class TicketService {
    private readonly ticketCollection = collection(db, 'tickets');



    private  ticketCollectionData: Observable<TicketType[]> = new Observable(observer =>{
        return onSnapshot(this.ticketCollection, (snapshot) =>{
            const tickets = snapshot.docs.map(doc =>{
                ( {id: doc.id , ... doc.data})
            }) as unknown as TicketType[];

            observer.next(tickets);
        }, error => observer.error(error))
    })

    private readonly ticketSubject = new BehaviorSubject<TicketType[]>([]);
    private readonly ticket$ = this.ticketSubject.asObservable();

    checkAlraedyExistTicket(userId: string, eventId:string): Observable<boolean> {
        const ticketRef = query(this.ticketCollection, where('userId', '==', userId), where('event_id', '==', eventId));

        return from(getDocs(ticketRef)).pipe(
            map(snapshot =>{
                if(snapshot.empty){
                    return false;
                }
                else{
                    return true;
                }
            })
        )
    }

    createTicket(userId: string, eventId: string, total_price: number, expire_at: string): Observable<TicketType>{
        return from(
            addDoc(this.ticketCollection, {
            user_id: userId,
            event_id: eventId,
            total_price: total_price,
            created_at: new Date(),
            used_at: null,
            status: 'active',
            paid: false,
            expire_at: Timestamp.fromDate(new Date(expire_at)),
        })).pipe(
            map(docRef =>{
                
                return { user_id: userId, event_id: eventId, total_price: total_price, status: 'unused', create_at: new Date() } as unknown as TicketType;
            }),catchError((error: any) =>{
                
                return [];
            })
        )
    }

    getTicketsPaidStatus(userId: string, eventId: string, paidStatus: boolean): Observable<TicketType[]>{
        const ticketRef = query(this.ticketCollection, where('user_id', '==', userId), where('event_id', '==', eventId), where('paid', '==', paidStatus));
        return from(getDocs(ticketRef)).pipe(
            map(snapshot =>{
                if(snapshot.empty){
                    return [];
                }
                else{
                    const tickets = snapshot.docs.map(doc =>{
                        return {id: doc.id, ...doc.data()} as unknown as TicketType;
                    });
                    return tickets;
                }
            })
        )
    }

    getAllTicketsByUserId(userId: string): Observable<TicketType[]>{
        const ticketRef = query(this.ticketCollection, where('user_id', '==', userId));
        return from(getDocs(ticketRef)).pipe(
            map(snapshot =>{
                if(snapshot.empty){    
                    return [];
                }
                else{
                    
                    const tickets = snapshot.docs.map(doc =>{
                        
                        return {id: doc.id, ...doc.data()} as unknown as TicketType;
                    });
                    
                    return tickets;
                }
            })
        )
    }

    changeStatusTicket(userId: string | undefined, eventIds: string[]): Observable<TicketType[]> {
        const queries = eventIds.map(eventId => {
          const ticketRef = query(
            this.ticketCollection,
            where('user_id', '==', userId),
            where('event_id', '==', eventId),
            where('status', 'in', ['active', 'unused', 'used'])
          );
      
          return from(getDocs(ticketRef)).pipe(
            map(snapshot => {
              const now = new Date();
              return snapshot.docs.map(doc => {
                const ticketData = doc.data();
                const expireAt = ticketData['expire_at'].toDate();
                if (now > expireAt) {
                  return { id: doc.id, ...ticketData, status: 'expired' } as unknown as TicketType;
                }
                return { id: doc.id, ...ticketData } as unknown as TicketType;
              });
            })
          );
        });
      
        
        return forkJoin(queries).pipe(
          map(results => results.flat()) 
        );
      }

      getEventPart(userId: string | undefined, eventIds: string[]): Observable<TicketType[]> {
        const queries = eventIds.map(eventId => {
          const ticketRef = query(
            this.ticketCollection,
            where('user_id', '==', userId),
            where('event_id', '==', eventId),
            where('status', '==', 'expired')
          );
      
          return from(getDocs(ticketRef)).pipe(
            map(snapshot => {
              return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as TicketType));
            })
          );
        });
      
        // Hợp nhất kết quả từ tất cả các truy vấn
        return forkJoin(queries).pipe(
          map(results => results.flat()) 
        );
      }
}