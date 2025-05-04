import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { auth } from '../../config/firebase.config';
import { forkJoin, Observable, Subscription } from 'rxjs';
import { TicketType } from '../../types/ticketstype';
import { SafeUrlService } from '../../service/santizer.service';
import { EventList } from '../../types/eventstype';
import { EventsService } from '../../service/events.service';
import { TicketService } from '../../service/ticket.service';
import { SafeUrl } from '@angular/platform-browser';
import { UsersService } from '../../service/users.service';
import { User } from '../../types/userstype';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { TabContentTicketsComponent } from '../tab-content-tickets/tab-content-tickets.component';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-ticket-events-manage',
  standalone: true,
  imports: [CommonModule, TabContentTicketsComponent],
  templateUrl: './ticket-events-manage.component.html',
  styleUrls: ['./ticket-events-manage.component.css'],
  animations: [
    trigger('tabAnimation', [
      state('void', style({ opacity: 0, transform: 'translateX(100%)' })),
      state('*', style({ opacity: 1, transform: 'translateX(0)' })),
      transition('void => *', animate('0.5s ease')),
      transition('* => void', animate('0.5s ease'))
    ])
  ]
})
export class TicketEventsManageComponent implements OnInit, OnDestroy  {

  //khai bao
  private subscriptions: Subscription[] = [];
  private events$: Observable<EventList[]> 
  private user$: Observable<User[]>
  user: User | undefined
  
  event: EventList[] = []
  eventUnpaidValid: EventList[] = []
  eventUnpaidExpired: EventList[] = []
  eventPart: EventList[] = []
  eventUpcoming: EventList[] = []
  ticket:TicketType[] =[]
  eventUsed: EventList[] = []
  eventCancel: EventList[] = []
 
  listUpcomingTickets: string[] = []
  listUnpaidTicketValid: string[] = []
  listUnpaidTicketExpired: string[] = []
  listTicketsEventId: string[] = [];
  listTicketsUsed: string[] = []
  listTicketsCancel: string[] = []
  listTicketExpired: string[] = []

  changeTab: string = 'tab1';
  
  currentUser = auth.currentUser;
  

  constructor(
    private ticketService: TicketService,
    private eventsService: EventsService,
    private sanitizer: SafeUrlService,
    private usersService: UsersService

  ) 
  { 
    this.events$ = this.eventsService.events$;
    this.user$ = this.usersService.users$;
  }


  ngOnInit(): void {
    if(auth.currentUser){

     this.usersService.getCurrentUserById(auth.currentUser.uid).subscribe({
      next: (userData)=> {
        this.user = userData;
      }

     })
     this.ticketService.getAllTicketsByUserId(auth.currentUser.uid).pipe(
      tap(ticketData => {
        if (ticketData.length > 0) {
          this.ticket = ticketData;
          
          this.listTicketsEventId = this.ticket
            .map(ticket => ticket.event_id)
            .filter(eventId => typeof eventId === 'string'); 
          console.log('List of Ticket Event IDs:', this.listTicketsEventId);
        } else {
          console.log('No ticket found for this user');
        }
      }),
      switchMap(() => {
        this.eventsService.getEventByListId(this.listTicketsEventId)
        return forkJoin({
          activeTickets: this.ticketService.getUpcomingEvent(this.currentUser?.uid, this.listTicketsEventId),
          unpaidTicketsValid: this.ticketService.getTicketsUnPaidTicketsValid(this.currentUser?.uid, this.listTicketsEventId),
          unpaidTicketsExpired: this.ticketService.getTicketsUnPaidTicketsExpired(this.currentUser?.uid, this.listTicketsEventId),
          usedTickets: this.ticketService.getUseStatusTickets(this.currentUser?.uid, this.listTicketsEventId, 'used'),
          expiredTickets: this.ticketService.getEventPart(this.currentUser?.uid, this.listTicketsEventId),
          canceledTickets: this.ticketService.getCancalledTickets(this.currentUser?.uid, this.listTicketsEventId),
        });
      })
    ).subscribe({
      next: ({ activeTickets, unpaidTicketsValid, unpaidTicketsExpired,  usedTickets , expiredTickets , canceledTickets}) => {

        this.listUpcomingTickets = activeTickets.map(ticket => ticket.event_id).filter(eventId => typeof eventId === 'string');
        this.eventsService.getEventByListId(this.listUpcomingTickets).subscribe({
          next: (events) => {
            this.eventUpcoming = events;
            console.log('Upcoming Events:', this.eventUpcoming);
          }
        });

        this.listUnpaidTicketValid = unpaidTicketsValid.map(ticket => ticket.event_id).filter(eventId => typeof eventId === 'string');
        this.eventsService.getEventByListId(this.listUnpaidTicketValid).subscribe({
          next: (events) =>{
            this.eventUnpaidValid = events;
            console.log('Unpaid Valid Events:', this.eventUnpaidValid);
          }
        })
        this.listUnpaidTicketExpired = unpaidTicketsExpired.map(ticket => ticket.event_id).filter(eventId => typeof eventId === 'string');
        this.eventsService.getEventByListId(this.listUnpaidTicketExpired).subscribe({
          next: (events) =>{
            this.eventUnpaidExpired = events;
            console.log('Unpaid Expired Events:', this.eventUnpaidExpired);
          }
        })

        this.listTicketsUsed = usedTickets.map(ticket => ticket.event_id).filter(eventId => typeof eventId === 'string');
        this.eventsService.getEventByListId(this.listTicketsUsed).subscribe({
          next: (events) =>{
            this.eventUsed = events;
            console.log('Used Events:', this.eventUsed);
          }
        })
        this.listTicketsCancel = canceledTickets.map(ticket => ticket.event_id).filter(eventId => typeof eventId === 'string');
        this.eventsService.getEventByListId(this.listTicketsCancel).subscribe({
          next: (events) =>{
            this.eventCancel = events;
            console.log('Canceled Events:', this.eventCancel);
          }
        })
        this.listTicketExpired = expiredTickets.map(ticket => ticket.event_id).filter(eventId => typeof eventId === 'string');
        this.eventsService.getEventByListId(this.listTicketExpired).subscribe({
          next: (events) =>{
            this.eventPart = events;
            console.log('Part Events:', this.eventPart);
          }
        })
        this.ticketService.changeStatusTicket(this.currentUser?.uid, this.listTicketsEventId)
          
      },
      error: (err) => {
        console.error('Error fetching events:', err);
      }
    });
     
    }
    
  }

  getSafeUrl(url: string | undefined): SafeUrl| undefined{
    
    return this.sanitizer.sanitizeImageUrl(url);

  }
  changeTabSelected(tab: string): void{
    this.changeTab = tab
    console.log(tab)
  }

  
  

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
