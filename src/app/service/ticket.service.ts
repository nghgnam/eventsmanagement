import { Injectable } from '@angular/core';
import { auth } from '../config/firebase.config';
import { Observable, of, from, BehaviorSubject } from 'rxjs';
import { TicketType } from '../types/ticketstype';
import { addDoc, collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { catchError, debounceTime, map, switchMap, tap } from 'rxjs/operators';
import { db } from '../config/firebase.config';
import { error } from 'console';
Injectable({
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

    getAllTicketsWithuserIdAndEventId(userId: string, eventId: string): Observable<TicketType[]>{

        if(!userId || !eventId){
            console.log('userid or eventId is empty');
            return of([]);
        }
        const ticketDocRef = query(this.ticketCollection, where('user_id', '==', userId), where('event_id', '==', eventId));
        
        return from(getDocs(ticketDocRef))
            .pipe(
                debounceTime(300),
                switchMap(snapshot => {
                    if (snapshot.empty) {
                        return from(
                            addDoc(this.ticketCollection, {
                                user_id: userId,
                                event_id: eventId,
                                status: 'unused',
                                create_at: new Date(),
                                used_at: null
                            })
                        ).pipe(
                            switchMap(() => from(getDocs(ticketDocRef))),
                            map(newSnapshot => newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as TicketType))),
                            tap(() => { console.log('add ticket success') })
                        );
                    } else {
                        return of(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as TicketType)));
                    }
                })
            );
        
    }

    
}