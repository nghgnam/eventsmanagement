import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { auth } from '../config/firebase.config';
import { Observable } from 'rxjs';
import { TicketType } from '../types/ticketstype';
import { SafeUrlService } from '../service/santizer.service';
import { EventList } from '../types/eventstype';
import { EventsService } from '../service/events.service';
import { TicketService } from '../service/ticket.service';
@Component({
  selector: 'app-ticket-events-manage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-events-manage.component.html',
  styleUrls: ['./ticket-events-manage.component.css']
})
export class TicketEventsManageComponent implements OnInit , OnDestroy {
  //khai bao


  constructor(private ticketService: TicketService) { }


  ngOnInit(): void {}




  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }
}
