import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { addDoc, collection, getDocs, onSnapshot, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { forkJoin, from, Observable, of } from 'rxjs';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';
import { db } from '../config/firebase.config';
import { TicketType } from '../models/ticketstype';

@Injectable({
    providedIn: 'root'
})

export class TicketService {
    private platformId = inject(PLATFORM_ID);
    private ticketCollection: ReturnType<typeof collection> | null = null;
    private readonly destroyRef = inject(DestroyRef);
    private readonly ticketsSignal = signal<TicketType[]>([]);
    readonly tickets$ = toObservable(this.ticketsSignal.asReadonly());
    private readonly ticketListeners = new Map<string, () => void>();

    constructor() {
        this.destroyRef.onDestroy(() => this.stopAllTicketListeners());
    }

    private getTicketCollection() {
        if (!isPlatformBrowser(this.platformId)) {
            throw new Error('Firestore collection can only be accessed in browser environment');
        }
        if (!this.ticketCollection) {
            this.ticketCollection = collection(db, 'tickets');
        }
        return this.ticketCollection;
    }

    listenToUserTickets(userId: string | undefined): void {
        if (!userId) {
            return;
        }
        const key = `user:${userId}`;
        if (this.ticketListeners.has(key)) {
            return;
        }
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        const ticketRef = query(this.getTicketCollection(), where('userId', '==', userId));
        const unsubscribe = onSnapshot(ticketRef, snapshot => {
            const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketType));
            this.ticketsSignal.set(tickets);
        }, error => {
            console.error('Realtime tickets error:', error);
            this.ticketsSignal.set([]);
        });
        this.ticketListeners.set(key, unsubscribe);
    }

    stopListeningToUserTickets(userId: string | undefined): void {
        if (!userId) return;
        const key = `user:${userId}`;
        const unsubscribe = this.ticketListeners.get(key);
        if (unsubscribe) {
            unsubscribe();
            this.ticketListeners.delete(key);
        }
    }

    private stopAllTicketListeners(): void {
        this.ticketListeners.forEach(unsub => unsub());
        this.ticketListeners.clear();
    }

    checkAlraedyExistTicket(userId: string, eventId:string): Observable<boolean> {
        if (!isPlatformBrowser(this.platformId)) {
            return of(false);
        }
        const ticketRef = query(this.getTicketCollection(), where('userId', '==', userId), where('eventId', '==', eventId));

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
        const payload = {
            userId,
            eventId,
            status: 'active' as TicketType['status'],
            pricing: {
                total: total_price,
                currency: 'VND',
                paid: false
            },
            lifecycle: {
                createdAt: Timestamp.now(),
                expireAt: Timestamp.fromDate(new Date(expire_at)),
                usedAt: null,
                canceledAt: null
            },
            metadata: {}
        };
        return from(
            addDoc(this.getTicketCollection(), payload)
        ).pipe(
            map(docRef => ({ id: docRef.id, ...payload } as TicketType)),
            catchError((error) => {
                console.error('Error creating ticket:', error);
                return of(null as unknown as TicketType);
            })
        );
    }

    getTicketsUnPaidTicketsValid(userId: string | undefined, eventIds: string[]): Observable<TicketType[]>{
      if(userId === undefined || eventIds.length === 0){
        return of([]);
      }
      const now = Timestamp.now();

      const queries = eventIds.map(eventId => {
        if (!isPlatformBrowser(this.platformId)) {
            return of([]) as unknown as Observable<TicketType[]>;
        }
        const ticketRef = query(this.getTicketCollection(),
          where('userId', '==' , userId),
          where('eventId' , '==' ,eventId),
          where('status' , '==' , 'active'),
          where('pricing.paid' , '==' , false),
          where('lifecycle.expireAt', '>', now)
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
        if (!isPlatformBrowser(this.platformId)) {
            return of([]) as unknown as Observable<TicketType[]>;
        }
        const ticketRef = query(this.getTicketCollection(),
          where('userId', '==' , userId),
          where('eventId' , '==' ,eventId),
          where('status' , '==' , 'expired'),
          where('pricing.paid' , '==' , false),
          where('lifecycle.expireAt', '<=', now)
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
        if (!isPlatformBrowser(this.platformId)) {
            return of([]) as unknown as Observable<TicketType[]>;
        }
        const ticketRef = query(this.getTicketCollection(), where('userId', '==', userId));
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
            this.getTicketCollection(),
            where('userId', '==', userId),
            where('eventId', '==', eventId),
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
                    catchError((error) => {
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
            this.getTicketCollection(),
            where('userId', '==', userId),
            where('eventId', '==', eventId),
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
            this.getTicketCollection(),
            where('userId', '==', userId),
            where('eventId', '==', eventId),
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
          if (!isPlatformBrowser(this.platformId)) {
            return of([]) as unknown as Observable<TicketType[]>;
        }
        const ticketRef = query(this.getTicketCollection(), 
            where('userId', '==', userId), 
            where('eventId', '==' , eventId), 
            where('pricing.paid', '==', true),
            where('status', 'in', ['active', 'unused']),
            where('lifecycle.expireAt', '>=', now));

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
            this.getTicketCollection(),
            where('userId', '==', userId),
            where('eventId', '==', eventId),
            where('status', '==', status),
            where('pricing.paid', '==', true)
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