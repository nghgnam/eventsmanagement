
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TimestampLike } from '../../../core/models/eventstype';

/**
 * User Dashboard Component
 * 
 * Features:
 * - My Tickets: List of purchased tickets with QR codes
 * - Saved Events: Wishlist of saved events
 * - Order History: Transaction history with invoices
 */

interface SavedEvent {
  id?: string;
  name?: string;
  image_url?: string;
  startDate?: TimestampLike;
}

interface OrderEvent {
  id?: string;
  name?: string;
}

interface Order {
  id?: string;
  created_at?: TimestampLike;
  status?: string;
  order_status?: string;
  event?: OrderEvent;
  tickets?: unknown[];
  total_price?: number;
}

interface Ticket {
  id?: string;
  eventName?: string;
  eventDate?: TimestampLike;
  ticketType?: string;
  used?: boolean;
  qrCodeUrl?: string;
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css']
})
export class UserDashboardComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);

  activeTab: 'tickets' | 'saved' | 'orders' = 'tickets';
  
  // Data
  
  myTickets: Ticket[] = [];
  savedEvents: SavedEvent[] = [];
  orderHistory: Order[] = [];

  // Loading states
  isLoadingTickets = false;
  isLoadingSaved = false;
  isLoadingOrders = false;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // TODO: Load user tickets
      // TODO: Load saved events
      // TODO: Load order history
    }
  }

  /**
   * Switch active tab
   */
  setActiveTab(tab: 'tickets' | 'saved' | 'orders'): void {
    this.activeTab = tab;
    // TODO: Load data for selected tab
  }

  /**
   * Remove event from saved list
   */
  removeSavedEvent(eventId?: string): void {
    if (!eventId) return;
    // TODO: Remove from saved events
  }

  /**
   * Download invoice
   */
  downloadInvoice(orderId?: string): void {
    if (!orderId) return;
    // TODO: Generate and download invoice PDF
  }

  /**
   * Download ticket
   */
  downloadTicket(ticketId?: string): void {
    if (!ticketId) return;
    // TODO: Generate and download ticket PDF
  }

  /**
   * Convert TimestampLike to Date for date pipe
   */
  getDate(timestamp?: TimestampLike): Date | null {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'string') return new Date(timestamp);
    if (typeof timestamp === 'object' && timestamp !== null) {
      if ('toDate' in timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      }
      if ('seconds' in timestamp && typeof timestamp.seconds === 'number') {
        return new Date(timestamp.seconds * 1000);
      }
      if ('_seconds' in timestamp && typeof timestamp._seconds === 'number') {
        return new Date(timestamp._seconds * 1000);
      }
    }
    return null;
  }
}

