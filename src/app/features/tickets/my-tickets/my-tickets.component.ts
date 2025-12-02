import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

interface MyTicket {
  id: string;
  eventName: string;
  date: string; // ISO string
  location: string;
  quantity: number;
  ticketType: string;
  status: 'upcoming' | 'past';
}

@Component({
  selector: 'app-my-tickets',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-tickets.component.html',
  styleUrls: ['./my-tickets.component.css']
})
export class MyTicketsComponent {
  activeTab: 'upcoming' | 'past' = 'upcoming';

  // Dummy data for UI only
  tickets: MyTicket[] = [
    {
      id: 'TCK-001',
      eventName: 'Blood Donation Day 2025',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Bệnh viện 108, Hà Nội',
      quantity: 2,
      ticketType: 'Standard',
      status: 'upcoming'
    },
    {
      id: 'TCK-002',
      eventName: 'Charity Music Night',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Nhà hát Lớn, Hà Nội',
      quantity: 1,
      ticketType: 'VIP',
      status: 'past'
    }
  ];

  setTab(tab: 'upcoming' | 'past') {
    this.activeTab = tab;
  }

  get upcomingTickets(): MyTicket[] {
    return this.tickets.filter(t => t.status === 'upcoming');
  }

  get pastTickets(): MyTicket[] {
    return this.tickets.filter(t => t.status === 'past');
  }
}


