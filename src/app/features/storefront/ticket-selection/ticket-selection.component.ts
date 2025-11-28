import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, Input, OnInit, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

interface EventInfo {
  id: string;
  name: string;
  startDate: string | Date;
  location?: {
    address?: string;
  };
}

interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  available: number;
  total: number;
}

/**
 * Ticket Selection Component
 * 
 * Features:
 * - Select ticket types (VIP, Standard, Early Bird)
 * - Select quantity (with max limit per user)
 * - Countdown timer (10-15 minutes to hold tickets)
 * - Direct checkout (no global cart)
 * 
 * Race Condition Prevention:
 * - Real-time ticket availability check
 * - Lock mechanism for selected tickets
 */
@Component({
  selector: 'app-ticket-selection',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './ticket-selection.component.html',
  styleUrls: ['./ticket-selection.component.css']
})
export class TicketSelectionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  @Input() eventId: string = '';
  
  event: EventInfo | null = null;
  ticketTypes: TicketType[] = [];
  selectedTickets: Map<string, number> = new Map();
  totalPrice = 0;
  
  // Countdown timer
  countdownMinutes = 15;
  countdownSeconds = 0;
  countdownInterval: unknown = null;
  isTicketHeld = false;

  // Form for attendee info
  attendeeForm: FormGroup;

  constructor() {
    this.attendeeForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // TODO: Load event details
      // TODO: Load available ticket types
      // TODO: Start countdown timer when tickets selected
    }
  }

  /**
   * Select ticket type and quantity
   */
  selectTicket(_ticketTypeId: string, _quantity: number): void {
    // TODO: Check availability in real-time
    // TODO: Lock tickets (prevent race condition)
    // TODO: Update selectedTickets map
    // TODO: Calculate total price
    // TODO: Start countdown timer
  }

  /**
   * Remove ticket from selection
   */
  removeTicket(_ticketTypeId: string): void {
    // TODO: Remove from selectedTickets
    // TODO: Release ticket lock
    // TODO: Recalculate total
  }

  /**
   * Start countdown timer
   */
  startCountdown(): void {
    // TODO: Implement 15-minute countdown
    // TODO: Release tickets if timer expires
  }

  /**
   * Proceed to checkout
   */
  proceedToCheckout(): void {
    if (this.attendeeForm.invalid || this.selectedTickets.size === 0) {
      return;
    }

    // TODO: Validate ticket availability again
    // TODO: Navigate to checkout with ticket data
    this.router.navigate(['/checkout'], {
      queryParams: {
        eventId: this.eventId,
        tickets: JSON.stringify(Array.from(this.selectedTickets.entries()))
      }
    });
  }

  /**
   * Get ticket type name (helper method)
   */
  getTicketTypeName(ticketTypeId: string): string {
    const ticketType = this.ticketTypes.find(t => t.id === ticketTypeId);
    return ticketType?.name || '';
  }

  /**
   * Get ticket price (helper method)
   */
  getTicketPrice(ticketTypeId: string): number {
    const ticketType = this.ticketTypes.find(t => t.id === ticketTypeId);
    return ticketType?.price || 0;
  }
}

