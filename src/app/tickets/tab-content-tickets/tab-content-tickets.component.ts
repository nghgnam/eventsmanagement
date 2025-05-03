import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventList } from '../../types/eventstype';
import { SafeUrlService } from '../../service/santizer.service';
import { SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { TicketType } from '../../types/ticketstype';
@Component({
  selector: 'app-tab-content-tickets',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-content-tickets.component.html',
  styleUrls: ['./tab-content-tickets.component.css']
})
export class TabContentTicketsComponent implements OnChanges {
  @Input() dataEvent: EventList[] = [];
  @Input() errorMessage: string = '';
  @Input() successMessage: string = '';
  @Input() isLoading: boolean = false;
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() sectionHeader: string = '';
  @Input() subsectionHeader: string =""
  @Input() dataTicket: TicketType[] = [];
  ticketStatus: { [eventId: string] : string} = {}

  ngOnChanges(): void {
    this.calculateTicketStatuses();
  }
  
  constructor(private sanitizer: SafeUrlService, private router: Router) { }
  getSafeUrl(url: string | undefined): SafeUrl | undefined {
    return this.sanitizer.sanitizeImageUrl(url);
  }

  viewDetails(eventId: string | undefined) {
    return this.router.navigate(['/detail-event', eventId]);
  }

  calculateTicketStatuses():void{
    this.ticketStatus = {};
    this.dataEvent.forEach(event => {
      const ticket = this.dataTicket.find(t => t.event_id === event.id);
      if (event.id) {
        this.ticketStatus[event.id] = ticket ? ticket.status : 'unknown';
      }
    })
    console.log('Ticket statuses:', this.ticketStatus);
  }

  getStatusTicketByEventId(eventId: string | undefined): string | undefined {
    const ticketStatus: TicketType | undefined = this.dataTicket.find(ticket => ticket.event_id === eventId);
    console.log('Ticket status for event ID:', eventId, 'is:', ticketStatus?.status);
    return ticketStatus?.status;
  }

  payNow(event: EventList): void {
    console.log('Paying for event:', event);
    // Add logic to handle payment
  }
}
