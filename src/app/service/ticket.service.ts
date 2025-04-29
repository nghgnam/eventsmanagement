import { Injectable } from '@angular/core';
import { auth } from '../config/firebase.config';
import { Observable, of, from, BehaviorSubject } from 'rxjs';
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
            userId: userId,
            event_id: eventId,
            total_price: total_price,
            createdAt: new Date(),
            used_at: null,
            status: 'active',
            paid: false,
            expire_at: expire_at
        })).pipe(
            map(docRef =>{
                console.log('Ticket created with ID:', docRef.id);
                return { user_id: userId, event_id: eventId, total_price: total_price, status: 'unused', create_at: new Date() } as unknown as TicketType;
            }),catchError((error: any) =>{
                console.error('Error creating ticket:', error);
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
}