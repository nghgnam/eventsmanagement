import { animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription, forkJoin, of } from 'rxjs';
import { catchError, finalize, switchMap, tap } from 'rxjs/operators';
import { auth } from '../../../core/config/firebase.config';
import { EventsService } from '../../../core/services/events.service';
import { SafeUrlService } from '../../../core/services/santizer.service';
import { TicketService } from '../../../core/services/ticket.service';
import { UsersService } from '../../../core/services/users.service';
import { EventList } from '../../../core/models/eventstype';
import { TicketType } from '../../../core/models/ticketstype';
import { User } from '../../../core/models/userstype';
import { TabContentTicketsComponent } from '../tab-content-tickets/tab-content-tickets.component';

interface TicketData {
  activeTickets: TicketType[];
  unpaidTicketsValid: TicketType[];
  unpaidTicketsExpired: TicketType[];
  usedTickets: TicketType[];
  expiredTickets: TicketType[];
  canceledTickets: TicketType[];
}

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
export class TicketEventsManageComponent implements OnInit, OnDestroy {
  private ticketService = inject(TicketService);
  private eventsService = inject(EventsService);
  private sanitizer = inject(SafeUrlService);
  private usersService = inject(UsersService);
  private router = inject(Router);

  private subscriptions: Subscription[] = [];
  private events$: Observable<EventList[]> = of([]);
  private user$: Observable<User[]> = of([]);
  
  user: User | undefined;
  isLoading = true;
  error: string | null = null;
  
  event: EventList[] = [];
  eventUnpaidValid: EventList[] = [];
  eventUnpaidExpired: EventList[] = [];
  eventPart: EventList[] = [];
  eventUpcoming: EventList[] = [];
  ticket: TicketType[] = [];
  eventUsed: EventList[] = [];
  eventCancel: EventList[] = [];
  
  listUpcomingTickets: string[] = [];
  listUnpaidTicketValid: string[] = [];
  listUnpaidTicketExpired: string[] = [];
  listTicketsEventId: string[] = [];
  listTicketsUsed: string[] = [];
  listTicketsCancel: string[] = [];
  listTicketExpired: string[] = [];

  changeTab: string = 'tab1';
  currentUser = auth.currentUser;

  ngOnInit(): void {
    this.events$ = this.eventsService.events$;
    this.user$ = this.usersService.users$;
    
    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
      if (!user) {
        this.clearUserData();
        this.router.navigate(['/login']);
      }
    });
    if (this.currentUser) {
      this.loadUserData();
    } else {
      this.router.navigate(['/login']);
    }
  }

  private loadUserData(): void {
    this.isLoading = true;
    this.error = null;

    const userSub = this.usersService.getCurrentUserById(this.currentUser?.uid || '').pipe(
      catchError(error => {
        this.error = 'Failed to load user data';
        console.error('Error loading user:', error);
        return of(null);
      })
    ).subscribe(userData => {
      if (userData) {
        this.user = userData;
        this.loadTickets();
      }
    });

    this.subscriptions.push(userSub);
  }

  private loadTickets(): void {
    if (!this.currentUser?.uid) return;

    const ticketsSub = this.ticketService.getAllTicketsByUserId(this.currentUser.uid).pipe(
      tap(ticketData => {
        if (ticketData.length > 0) {
          this.ticket = ticketData;
          this.listTicketsEventId = this.ticket
            .map((ticket: TicketType) => ticket.event_id)
            .filter((eventId: string | null | undefined): eventId is string => typeof eventId === 'string' && eventId !== null);
        }
      }),
      switchMap(() => {
        return forkJoin({
          activeTickets: this.ticketService.getUpcomingEvent(this.currentUser?.uid, this.listTicketsEventId),
          unpaidTicketsValid: this.ticketService.getTicketsUnPaidTicketsValid(this.currentUser?.uid, this.listTicketsEventId),
          unpaidTicketsExpired: this.ticketService.getTicketsUnPaidTicketsExpired(this.currentUser?.uid, this.listTicketsEventId),
          usedTickets: this.ticketService.getUseStatusTickets(this.currentUser?.uid, this.listTicketsEventId, 'used'),
          expiredTickets: this.ticketService.getEventPart(this.currentUser?.uid, this.listTicketsEventId),
          canceledTickets: this.ticketService.getCancalledTickets(this.currentUser?.uid, this.listTicketsEventId),
        });
      }),
      catchError(error => {
        this.error = 'Failed to load tickets';
        console.error('Error loading tickets:', error);
        return of(null);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(data => {
      if (data) {
        this.processTicketData(data);
      }
    });

    this.subscriptions.push(ticketsSub);
  }

  private processTicketData(data: TicketData): void {
    const { activeTickets, unpaidTicketsValid, unpaidTicketsExpired, usedTickets, expiredTickets, canceledTickets } = data;

    // Process active tickets
    this.listUpcomingTickets = activeTickets
      .map((ticket: TicketType) => ticket.event_id)
      .filter((eventId: string | null | undefined): eventId is string => typeof eventId === 'string' && eventId !== null);
    this.eventsService.getEventByListId(this.listUpcomingTickets).subscribe(events => {
      this.eventUpcoming = events;
    });

    // Process unpaid valid tickets
    this.listUnpaidTicketValid = unpaidTicketsValid
      .map((ticket: TicketType) => ticket.event_id)
      .filter((eventId: string | null | undefined): eventId is string => typeof eventId === 'string' && eventId !== null);
    this.eventsService.getEventByListId(this.listUnpaidTicketValid).subscribe(events => {
      this.eventUnpaidValid = events;
    });

    // Process unpaid expired tickets
    this.listUnpaidTicketExpired = unpaidTicketsExpired
      .map((ticket: TicketType) => ticket.event_id)
      .filter((eventId: string | null | undefined): eventId is string => typeof eventId === 'string' && eventId !== null);
    this.eventsService.getEventByListId(this.listUnpaidTicketExpired).subscribe(events => {
      this.eventUnpaidExpired = events;
    });

    // Process used tickets
    this.listTicketsUsed = usedTickets
      .map((ticket: TicketType) => ticket.event_id)
      .filter((eventId: string | null | undefined): eventId is string => typeof eventId === 'string' && eventId !== null);
    this.eventsService.getEventByListId(this.listTicketsUsed).subscribe(events => {
      this.eventUsed = events;
    });

    // Process canceled tickets
    this.listTicketsCancel = canceledTickets
      .map((ticket: TicketType) => ticket.event_id)
      .filter((eventId: string | null | undefined): eventId is string => typeof eventId === 'string' && eventId !== null);
    this.eventsService.getEventByListId(this.listTicketsCancel).subscribe(events => {
      this.eventCancel = events;
    });

    // Process expired tickets
    this.listTicketExpired = expiredTickets
      .map((ticket: TicketType) => ticket.event_id)
      .filter((eventId: string | null | undefined): eventId is string => typeof eventId === 'string' && eventId !== null);
    this.eventsService.getEventByListId(this.listTicketExpired).subscribe(events => {
      this.eventPart = events;
    });

    // Update ticket statuses
    this.ticketService.changeStatusTicket(this.currentUser?.uid, this.listTicketsEventId);
  }

  private clearUserData(): void {
    this.user = undefined;
    this.ticket = [];
    this.event = [];
    this.eventUnpaidValid = [];
    this.eventUnpaidExpired = [];
    this.eventPart = [];
    this.eventUpcoming = [];
    this.eventUsed = [];
    this.eventCancel = [];
    this.listUpcomingTickets = [];
    this.listUnpaidTicketValid = [];
    this.listUnpaidTicketExpired = [];
    this.listTicketsEventId = [];
    this.listTicketsUsed = [];
    this.listTicketsCancel = [];
    this.listTicketExpired = [];
  }

  getSafeUrl(url: string | undefined): string | undefined {
    return this.sanitizer.getSafeUrl(url, true);
  }

  changeTabSelected(tab: string): void {
    this.changeTab = tab;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
