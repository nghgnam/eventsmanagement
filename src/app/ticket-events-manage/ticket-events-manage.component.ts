import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { auth } from '../config/firebase.config';
import { Observable, Subscription } from 'rxjs';
import { TicketType } from '../types/ticketstype';
import { SafeUrlService } from '../service/santizer.service';
import { EventList } from '../types/eventstype';
import { EventsService } from '../service/events.service';
import { TicketService } from '../service/ticket.service';
import { SafeUrl } from '@angular/platform-browser';
import { UsersService } from '../service/users.service';
import { User } from '../types/userstype';
@Component({
  selector: 'app-ticket-events-manage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-events-manage.component.html',
  styleUrls: ['./ticket-events-manage.component.css']
})
export class TicketEventsManageComponent implements OnInit, OnDestroy  {
  //khai bao
  private subscriptions: Subscription[] = [];
  private events$: Observable<EventList[]> 
  private user$: Observable<User[]>
  user: User | undefined
  event: EventList | undefined;
  ticket:TicketType[] =[]

  changeTab: string = 'tab1';
  errorMessage: string = '';
  successMessage: string = '';
  isLoading = false;
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
     this.ticketService.getAllTicketsByUserId(auth.currentUser.uid).subscribe(ticketData => {
      if(ticketData.length > 0){
        this.ticket = ticketData;
        

      }
      else{
        console.log('No ticket found for this user')
      }
     })
    }
    
  }

  getSafeUrl(url: string | undefined): SafeUrl| undefined{
    
    return this.sanitizer.sanitizeImageUrl(url);

  }
  changeTabSelected(tab: string): void{
    this.changeTab = tab
  }
  

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
