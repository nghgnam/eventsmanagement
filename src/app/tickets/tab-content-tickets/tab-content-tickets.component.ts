import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventList } from '../../types/eventstype';
import { SafeUrlService } from '../../service/santizer.service';
import { SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { TicketType } from '../../types/ticketstype';
import { GroupEventData, GroupEventDataType } from '../../types/groupEventDatType';
@Component({
  selector: 'app-tab-content-tickets',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-content-tickets.component.html',
  styleUrls: ['./tab-content-tickets.component.css']
})
export class TabContentTicketsComponent implements OnChanges {
  @Input() dataEvent: EventList[] | { valid: EventList[]; expired: EventList[]; } = { valid: [], expired: [] };
  @Input() errorMessage: string = '';
  @Input() successMessage: string = '';
  @Input() isLoading: boolean = false;
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() sectionHeader: string = '';
  @Input() subsectionHeader: string =""
  @Input() dataTicket: TicketType[] | undefined
  @Input() mode: 'single' | 'multiple' = 'single';
  ticketStatus: { [eventId: string] : string} = {}

  getAllEvent(): EventList[]{
    if(Array.isArray(this.dataEvent)){
      return this.dataEvent;
    }
    else if( typeof this.dataEvent === 'object' && this.dataEvent !== null){
      return Object.values(this.dataEvent).flat();
    }

    return []
  }

  getGroupEventData(): GroupEventDataType[] {
    if (this.mode !== 'multiple' || typeof this.dataEvent !== 'object') {
      return [];
    }
    console.log("dataEvent", this.dataEvent);

    return Object.entries(this.dataEvent as GroupEventData)
    .filter(([_, events]) => Array.isArray(events) && events.length > 0)
    .map(([key, events]) => ({
      label: this.formatGroupLabel(key),
      events: events
    }));
  }
  readonly labels: Record<string, string> ={
    valid: 'Valid Tickets',
    expired: 'Expired Tickets',
    unpaid: 'Unpaid Tickets',
    used: 'Used Tickets',
    cancel: 'Cancelled Tickets',
    upcoming: 'Upcoming Tickets',
    part: 'Part Tickets',
    unused: 'Unused Tickets',
    cancelled: 'Cancelled Tickets'
  }
  formatGroupLabel(key: string): string{
    
    return this.labels[key] || key;
  }

  get getSingleList(): EventList[] {
    return  Array.isArray(this.dataEvent) ? this.dataEvent : []
  }

  ngOnChanges(changes: SimpleChanges): void {
    if( changes['dataEvent'] || changes['dataTicket']){
      this.calculateTicketStatuses();
    }
  }
  
  constructor(private sanitizer: SafeUrlService, private router: Router) { }
  getSafeUrl(url: string | undefined): SafeUrl | undefined {
    return this.sanitizer.sanitizeImageUrl(url);
  }

  viewDetails(eventId: string | undefined) {
    return this.router.navigate(['/detail', eventId]);
  }

  calculateTicketStatuses(): void{
    this.ticketStatus = {};

    const allEvents = this.getAllEvent();
    allEvents.forEach(event =>{
      const ticket = this.dataTicket?.find(t => t.event_id === event.id);
      if(event.id){
        this.ticketStatus[event.id] = ticket ?  ticket?.status: 'unknown'
      }
    })
    
  }

  getStatusTicketByEventId(eventId: string | undefined): string | undefined {
    const ticketStatus: TicketType | undefined = this.dataTicket?.find(ticket => ticket.event_id === eventId);
    console.log('Ticket status for event ID:', eventId, 'is:', ticketStatus?.status);
    return ticketStatus?.status;
  }

  

  payNow(event: EventList): void {
    console.log('Paying for event:', event);
    // Add logic to handle payment
  }
}
