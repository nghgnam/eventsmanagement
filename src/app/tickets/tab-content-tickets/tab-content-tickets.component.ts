import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { SafeUrlService } from '../../core/services/santizer.service';
import { EventList } from '../../core/models/eventstype';
import { GroupEventData, GroupEventDataType } from '../../core/models/groupEventDatType';
import { TicketType } from '../../core/models/ticketstype';
@Component({
  selector: 'app-tab-content-tickets',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-content-tickets.component.html',
  styleUrls: ['./tab-content-tickets.component.css']
})
export class TabContentTicketsComponent implements OnChanges {
  private sanitizer = inject(SafeUrlService);
  private router = inject(Router);

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
    .filter(([events]) => Array.isArray(events) && events.length > 0)
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

  constructor(){}
  
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
      if(!event.id){
        return;
      }
      const eventId: string = event.id;
      const ticket = this.dataTicket?.find(t => t.event_id === eventId);
      const resolvedStatus = (ticket?.status ?? 'unknown') as string;
      this.ticketStatus[eventId] = resolvedStatus;
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
