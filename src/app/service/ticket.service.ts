import { Injectable, Query } from '@angular/core';
import { auth } from '../config/firebase.config';
import { Observable, of, from, BehaviorSubject, forkJoin } from 'rxjs';
import { TicketType } from '../types/ticketstype';
import { addDoc, collection, DocumentData, getDocs, onSnapshot, query, QuerySnapshot, Timestamp, updateDoc, where } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { catchError, debounceTime, map, mergeMap, switchMap, tap, toArray } from 'rxjs/operators';
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

    getTicketsUnPaidTicketsValid(userId: string | undefined, eventIds: string[]): Observable<TicketType[]>{
      if(userId === undefined || eventIds.length === 0){
        return of([]);
      }
      const now = Timestamp.now();

      const queries = eventIds.map(eventId => {
        const ticketRef = query(this.ticketCollection,
          where('user_id', '==' , userId),
          where('event_id' , '==' ,eventId),
          where('status' , '==' , 'active'),
          where('paid' , '==' , false),
          where('expire_at', '>', now)
        )

        return from(getDocs(ticketRef)).pipe(
          map(snapshot => {
            if(snapshot.empty){
              return []
            }
            else{
              return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as unknown as TicketType[];
            }
          })
        )
      })

      return forkJoin(queries).pipe(
        map(results => results.flat()),
      )

      
    }

    getTicketsUnPaidTicketsExpired(userId: string | undefined, eventIds: string[]): Observable<TicketType[]>{
      if(userId === undefined || eventIds.length === 0){
        return of([]);
      }
      const now = Timestamp.now();

      const queries = eventIds.map(eventId => {
        const ticketRef = query(this.ticketCollection,
          where('user_id', '==' , userId),
          where('event_id' , '==' ,eventId),
          where('status' , '==' , 'expired'),
          where('paid' , '==' , false),
          where('expire_at', '<=', now)
        )

        return from(getDocs(ticketRef)).pipe(
          map(snapshot => {
            if(snapshot.empty){
              return []
            }
            else{
              return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as unknown as TicketType[];
            }
          })
        )
      })

      return forkJoin(queries).pipe(
        map(results => results.flat()),
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

    changeStatusTicket(userId: string | undefined, eventIds: string[]): Observable<void> {
        const queries = eventIds.map(eventId => {
          const ticketRef = query(
            this.ticketCollection,
            where('user_id', '==', userId),
            where('event_id', '==', eventId),
            where('status', 'in', ['active', 'unused', 'used'])
          );
      
          return from(getDocs(ticketRef)).pipe(
            mergeMap(snapshot => {
              const now = new Date();
              const updateOps =  snapshot.docs.map(doc => {
                const ticketData = doc.data();
                const expireAt = ticketData['expire_at'].toDate();
                if (now > expireAt) {
                  return from(
                    updateDoc(doc.ref, {
                      status: 'expired',
                      used_at: null,
                      paid: false
                    })
                  ).pipe(
                    tap(()=> {
                      console.log(`Ticket with ID ${doc.id} has been updated to expired.`);
                    }),
                    catchError((error: any) => {
                      console.error(`Error updating ticket with ID ${doc.id}:`, error);
                      return of(null); 
                    })

                  )
                }
                return of(null)
                
              });

              return updateOps.length > 0 ? forkJoin(updateOps) : of(null); 
            })
          );
        });
        return forkJoin(queries).pipe(
          map(()=> void 0)
        )

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
      

        return forkJoin(queries).pipe(
          map(results => results.flat()) 
        );
      }
      getCancalledTickets(userId: string | undefined, eventIds: string[]): Observable<TicketType[]> {
        const queries = eventIds.map(eventId => {
          const ticketRef = query(
            this.ticketCollection,
            where('user_id', '==', userId),
            where('event_id', '==', eventId),
            where('status', '==', 'canceled')
          );
      
          return from(getDocs(ticketRef)).pipe(
            map(snapshot => {
              return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as TicketType));
            })
          );
        });
      

        return forkJoin(queries).pipe(
          map(results => results.flat()) 
        );
      }
      
      getUpcomingEvent(userId: string | undefined, eventIds: string[]): Observable<TicketType[]>{
        const now = Timestamp.now();
        const queries = eventIds.map(eventId =>{
          const ticketRef = query(this.ticketCollection, 
            where('user_id', '==', userId), 
            where('event_id', '==' , eventId), 
            where('status', 'in', ['active', 'unused']),
            where('expire_at', '>=', now));

          return from(getDocs(ticketRef)).pipe(
            map(snapshot =>{
              return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as TicketType))
            })
          )
        })
        return forkJoin(queries).pipe(
          map(results => results.flat())

        )
      }

      getUseStatusTickets(userId: string | undefined, eventIds: string[], status: 'used' | 'unused'): Observable<TicketType[]> {
        const queries = eventIds.map(eventId => {
          const ticketRef = query(
            this.ticketCollection,
            where('user_id', '==', userId),
            where('event_id', '==', eventId),
            where('status', '==', 'unused'),
            where('paid', '==', true)
          );
      
          return from(getDocs(ticketRef)).pipe(
            map(snapshot => {
              return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as TicketType));
            })
          );
        });

        return forkJoin(queries).pipe(
          map(results => results.flat()) 
        );
      }

}