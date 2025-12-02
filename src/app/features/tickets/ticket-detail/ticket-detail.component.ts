import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './ticket-detail.component.html',
  styleUrls: ['./ticket-detail.component.css']
})
export class TicketDetailComponent implements OnInit {
  // Dummy ticket data for UI demo
  ticket = {
    id: 'TCK-001',
    eventName: 'Blood Donation Day 2025',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    location: 'Bệnh viện 108, Hà Nội',
    ticketType: 'Standard',
    quantity: 2,
    seat: 'A12',
    qrValue: 'TCK-001-QR-DATA'
  };
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();
  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.ticket.id = params.get('id') as string;
    });
  } 

  downloadTicket(format: 'pdf' | 'image') {
    // TODO: Implement real download (PDF/image) when backend/service is available
    console.log(`Download ticket ${this.ticket.id} as ${format}`);
  }
}


