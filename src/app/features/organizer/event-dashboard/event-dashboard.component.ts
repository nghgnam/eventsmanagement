import { Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EventList } from '../../../core/models/eventstype';

/**
 * Event Dashboard Component
 * 
 * Features:
 * - Real-time sales monitoring (Firestore Realtime)
 * - Attendees list with check-in status
 * - Export data to Excel/CSV
 * - Analytics charts
 */
interface AttendeeRow {
  id: string;
  name: string;
  email: string;
  ticketType: string;
  purchaseDate: string | Date;
  checkedIn: boolean;
}

@Component({
  selector: 'app-event-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './event-dashboard.component.html',
  styleUrls: ['./event-dashboard.component.css']
})
export class EventDashboardComponent {
  private platformId = inject(PLATFORM_ID);

  eventId: string = '';

  event: EventList | null = null;
  
  // Sales data
  totalSales = 124; // tổng số đơn hàng (dummy)
  totalTicketsSold = 320; // vé đã bán (dummy)
  totalTicketsRemaining = 80; // vé còn lại (dummy)
  totalRevenue = 52000000; // doanh thu (VND, dummy)
  salesChartData: unknown[] = [];
  pageViews = 5400; // lượt xem trang (dummy)
  conversionRate = 8.5; // %
  uniqueVisitors = 3200; // dummy
  
  // Attendees
  attendees: AttendeeRow[] = [];
  checkedInCount = 0;
  notCheckedInCount = 0;
  
  // Filters
  filterStatus: 'all' | 'checked-in' | 'not-checked-in' = 'all';
  searchQuery = '';

  isLoading = false;

  /**
   * Load real-time sales data
   */
  loadSalesData(): void {
    // TODO: Subscribe to Firestore real-time updates
    // TODO: Update sales chart data
    // TODO: Calculate totals
  }

  /**
   * Load attendees list
   */
  loadAttendees(): void {
    // TODO: Load attendees from Firestore
    // TODO: Apply filters
  }

  /**
   * Export attendees to Excel/CSV
   */
  exportAttendees(): void {
    // TODO: Generate Excel/CSV file
    // TODO: Trigger download
  }

  /**
   * Filter attendees
   */
  filterAttendees(): void {
    // TODO: Apply status filter
    // TODO: Apply search query
  }

  /**
   * View attendee details
   */
  viewAttendeeDetails(_attendeeId: string): void {
    // TODO: Show attendee details modal
  }

  /**
   * Get event start date for display
   */
  getEventStartDate(): Date | null {
    if (!this.event) return null;
    const startDate = this.event.schedule?.startDate;
    if (!startDate) return null;
    if (startDate instanceof Date) return startDate;
    if (typeof startDate === 'string') return new Date(startDate);
    if (typeof startDate === 'object' && startDate !== null) {
      if ('toDate' in startDate && typeof startDate.toDate === 'function') {
        return startDate.toDate();
      }
      if ('seconds' in startDate && typeof startDate.seconds === 'number') {
        return new Date(startDate.seconds * 1000);
      }
      if ('_seconds' in startDate && typeof startDate._seconds === 'number') {
        return new Date(startDate._seconds * 1000);
      }
    }
    return null;
  }
}

