import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { auth } from '../../config/firebase.config';
import { Observable, Subscription } from 'rxjs';
import { TicketType } from '../../types/ticketstype';
import { SafeUrlService } from '../../service/santizer.service';
import { EventList } from '../../types/eventstype';
import { EventsService } from '../../service/events.service';
import { TicketService } from '../../service/ticket.service';
import { SafeUrl } from '@angular/platform-browser';
import { UsersService } from '../../service/users.service';
import { User } from '../../types/userstype';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { UnpaidTicketsComponent } from "../unpaid-tickets/unpaid-tickets.component";
import { UpcomingTicketsComponent } from '../upcoming-tickets/upcoming-tickets.component';
import { PastTicketsComponent } from '../past-tickets/past-tickets.component';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-ticket-events-manage',
  standalone: true,
  imports: [CommonModule, UnpaidTicketsComponent, UpcomingTicketsComponent, PastTicketsComponent],
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
  eventUnPai: EventList[] = []
  eventPart: EventList[] = []
  eventUpcoming: EventList[] = []
  ticket:TicketType[] =[]
  listTicketsEventId: string[] = [];

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
      switchMap(() => this.eventsService.getEventByListId(this.listTicketsEventId))
    ).subscribe({
      next: (eventData) => {
        this.event = eventData;
        this.ticketService.changeStatusTicket(this.currentUser?.uid, this.listTicketsEventId).subscribe({
          next: (data) => {
            console.log('Ticket status updated:', data);
          },
          error: (err) => {
            console.error('Error updating ticket status:', err);
          }
        })
        this.ticketService.getEventPart(this.currentUser?.uid, this.listTicketsEventId).subscribe({
          next: (eventPartData) => {
            
            console.log('Event part data:', eventPartData);
          },
          error: (err) => {
            console.error('Error fetching event part data:', err);
          }
        })
        console.log('Event data:', this.event);
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
