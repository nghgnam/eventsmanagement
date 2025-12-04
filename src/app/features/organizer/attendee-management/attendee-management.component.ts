import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { EventList } from '../../../core/models/eventstype';
import { EventsService } from '../../../core/services/events.service';

/**
 * Attendee Management Component
 * 
 * Features:
 * - Detailed attendee list with all purchase information
 * - Export to CSV/Excel for marketing or manual check-in
 * - Bulk email notifications (e.g., send Zoom link for online events)
 */

export interface AttendeeDetail {
  id: string;
  orderId: string;
  name: string;
  email: string;
  phone: string;
  ticketType: string;
  ticketQuantity: number;
  purchaseDate: Date | string;
  totalAmount: number;
  checkedIn: boolean;
  checkInTime?: Date | string;
  seatInfo?: string;
  paymentMethod: string;
  paymentStatus: 'paid' | 'pending' | 'refunded';
  notes?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

@Component({
  selector: 'app-attendee-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './attendee-management.component.html',
  styleUrls: ['./attendee-management.component.css']
})
export class AttendeeManagementComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);
  private eventsService = inject(EventsService);

  eventId: string = '';
  event: EventList | undefined = undefined;

  // Attendees data
  allAttendees: AttendeeDetail[] = [];
  filteredAttendees: AttendeeDetail[] = [];
  
  // Filters
  searchQuery = '';
  filterStatus: 'all' | 'checked-in' | 'not-checked-in' = 'all';
  filterTicketType: string = 'all';
  filterPaymentStatus: 'all' | 'paid' | 'pending' | 'refunded' = 'all';
  
  // Selection
  selectedAttendees: Set<string> = new Set();
  selectAll = false;

  // Export
  exportFormat: 'csv' | 'excel' = 'csv';
  isExporting = false;

  // Bulk Email
  showEmailModal = false;
  emailForm = {
    recipients: 'selected' as 'selected' | 'all' | 'filtered',
    template: '',
    subject: '',
    body: '',
    includeEventInfo: true,
    includeTicketInfo: true
  };
  emailTemplates: EmailTemplate[] = [
    {
      id: 'zoom-link',
      name: 'Gửi link Zoom (Online Event)',
      subject: 'Thông tin tham gia sự kiện {eventName}',
      body: 'Xin chào {attendeeName},\n\nCảm ơn bạn đã đăng ký tham gia sự kiện {eventName}.\n\nLink tham gia Zoom:\n{zoomLink}\n\nThời gian: {eventDate}\n\nTrân trọng,\nBan tổ chức'
    },
    {
      id: 'reminder',
      name: 'Nhắc nhở sự kiện sắp diễn ra',
      subject: 'Nhắc nhở: Sự kiện {eventName} sắp diễn ra',
      body: 'Xin chào {attendeeName},\n\nNhắc nhở: Sự kiện {eventName} sẽ diễn ra vào {eventDate}.\n\nĐịa điểm: {eventLocation}\n\nVui lòng có mặt đúng giờ.\n\nTrân trọng,\nBan tổ chức'
    },
    {
      id: 'venue-change',
      name: 'Thông báo thay đổi địa điểm',
      subject: 'Thông báo thay đổi địa điểm sự kiện {eventName}',
      body: 'Xin chào {attendeeName},\n\nChúng tôi xin thông báo về việc thay đổi địa điểm của sự kiện {eventName}.\n\nĐịa điểm mới: {newLocation}\n\nThời gian vẫn giữ nguyên: {eventDate}\n\nXin lỗi vì sự bất tiện này.\n\nTrân trọng,\nBan tổ chức'
    },
    {
      id: 'custom',
      name: 'Tùy chỉnh',
      subject: '',
      body: ''
    }
  ];
  isSendingEmail = false;

  // Stats
  totalAttendees = 0;
  checkedInCount = 0;
  notCheckedInCount = 0;
  totalRevenue = 0;

  isLoading = false;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.route.paramMap.subscribe(params => {
        this.eventId = params.get('eventId') || '';
        if (this.eventId) {
          this.loadEventDetails(this.eventId);
          this.loadAttendees();
        }
      });
    }
  }

  loadEventDetails(eventId: string): void {
    this.isLoading = true;
    this.eventsService.getEventById(eventId).subscribe({
      next: (event) => {
        this.event = event;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading event details:', error);
        this.isLoading = false;
      }
    });
  }

  loadAttendees(): void {
    // TODO: Load from backend
    // Dummy data for UI
    this.allAttendees = [
      {
        id: 'a1',
        orderId: 'ORD-001',
        name: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com',
        phone: '0901234567',
        ticketType: 'VIP',
        ticketQuantity: 2,
        purchaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        totalAmount: 500000,
        checkedIn: true,
        checkInTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        seatInfo: 'A1, A2',
        paymentMethod: 'VNPay',
        paymentStatus: 'paid',
        notes: 'Khách VIP'
      },
      {
        id: 'a2',
        orderId: 'ORD-002',
        name: 'Trần Thị B',
        email: 'tranthib@example.com',
        phone: '0902345678',
        ticketType: 'Standard',
        ticketQuantity: 1,
        purchaseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        totalAmount: 200000,
        checkedIn: false,
        paymentMethod: 'Momo',
        paymentStatus: 'paid'
      },
      {
        id: 'a3',
        orderId: 'ORD-003',
        name: 'Lê Văn C',
        email: 'levanc@example.com',
        phone: '0903456789',
        ticketType: 'Early Bird',
        ticketQuantity: 3,
        purchaseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        totalAmount: 450000,
        checkedIn: true,
        checkInTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
        paymentMethod: 'Stripe',
        paymentStatus: 'paid'
      },
      {
        id: 'a4',
        orderId: 'ORD-004',
        name: 'Phạm Thị D',
        email: 'phamthid@example.com',
        phone: '0904567890',
        ticketType: 'Standard',
        ticketQuantity: 1,
        purchaseDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        totalAmount: 200000,
        checkedIn: false,
        paymentMethod: 'PayPal',
        paymentStatus: 'pending'
      }
    ];

    this.updateStats();
    this.applyFilters();
  }

  updateStats(): void {
    this.totalAttendees = this.allAttendees.length;
    this.checkedInCount = this.allAttendees.filter(a => a.checkedIn).length;
    this.notCheckedInCount = this.totalAttendees - this.checkedInCount;
    this.totalRevenue = this.allAttendees
      .filter(a => a.paymentStatus === 'paid')
      .reduce((sum, a) => sum + a.totalAmount, 0);
  }

  applyFilters(): void {
    let filtered = [...this.allAttendees];

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.email.toLowerCase().includes(query) ||
        a.phone.includes(query) ||
        a.orderId.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(a =>
        this.filterStatus === 'checked-in' ? a.checkedIn : !a.checkedIn
      );
    }

    // Ticket type filter
    if (this.filterTicketType !== 'all') {
      filtered = filtered.filter(a => a.ticketType === this.filterTicketType);
    }

    // Payment status filter
    if (this.filterPaymentStatus !== 'all') {
      filtered = filtered.filter(a => a.paymentStatus === this.filterPaymentStatus);
    }

    this.filteredAttendees = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  toggleSelectAll(): void {
    if (this.selectAll) {
      this.filteredAttendees.forEach(a => this.selectedAttendees.add(a.id));
    } else {
      this.selectedAttendees.clear();
    }
  }

  toggleSelectAttendee(attendeeId: string): void {
    if (this.selectedAttendees.has(attendeeId)) {
      this.selectedAttendees.delete(attendeeId);
    } else {
      this.selectedAttendees.add(attendeeId);
    }
    this.updateSelectAllState();
  }

  updateSelectAllState(): void {
    this.selectAll = this.filteredAttendees.length > 0 &&
      this.filteredAttendees.every(a => this.selectedAttendees.has(a.id));
  }

  getSelectedAttendees(): AttendeeDetail[] {
    return this.allAttendees.filter(a => this.selectedAttendees.has(a.id));
  }

  exportAttendees(): void {
    this.isExporting = true;
    const dataToExport = this.filteredAttendees.length > 0 
      ? this.filteredAttendees 
      : this.allAttendees;

    if (this.exportFormat === 'csv') {
      this.exportToCSV(dataToExport);
    } else {
      this.exportToExcel(dataToExport);
    }

    setTimeout(() => {
      this.isExporting = false;
    }, 1000);
  }

  exportToCSV(attendees: AttendeeDetail[]): void {
    const headers = [
      'Order ID', 'Name', 'Email', 'Phone', 'Ticket Type', 'Quantity',
      'Purchase Date', 'Total Amount', 'Payment Method', 'Payment Status',
      'Checked In', 'Check-in Time', 'Seat Info', 'Notes'
    ];

    const rows = attendees.map(a => [
      a.orderId,
      a.name,
      a.email,
      a.phone,
      a.ticketType,
      a.ticketQuantity.toString(),
      a.purchaseDate instanceof Date ? a.purchaseDate.toISOString() : a.purchaseDate,
      a.totalAmount.toString(),
      a.paymentMethod,
      a.paymentStatus,
      a.checkedIn ? 'Yes' : 'No',
      a.checkInTime ? (a.checkInTime instanceof Date ? a.checkInTime.toISOString() : a.checkInTime) : '',
      a.seatInfo || '',
      a.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendees_${this.eventId}_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportToExcel(attendees: AttendeeDetail[]): void {
    // For Excel, we'll export as CSV with .xlsx extension
    // In production, use a library like xlsx or exceljs
    this.exportToCSV(attendees);
    console.log('Excel export would use xlsx library in production');
  }

  openEmailModal(): void {
    this.showEmailModal = true;
    this.emailForm.recipients = this.selectedAttendees.size > 0 ? 'selected' : 'filtered';
  }

  closeEmailModal(): void {
    this.showEmailModal = false;
    this.emailForm = {
      recipients: 'selected',
      template: '',
      subject: '',
      body: '',
      includeEventInfo: true,
      includeTicketInfo: true
    };
  }

  onTemplateChange(): void {
    const template = this.emailTemplates.find(t => t.id === this.emailForm.template);
    if (template && template.id !== 'custom') {
      this.emailForm.subject = template.subject;
      this.emailForm.body = template.body;
    }
  }

  sendBulkEmail(): void {
    if (!this.emailForm.subject.trim() || !this.emailForm.body.trim()) {
      alert('Vui lòng điền đầy đủ tiêu đề và nội dung email');
      return;
    }

    this.isSendingEmail = true;

    // Determine recipients
    let recipients: AttendeeDetail[] = [];
    if (this.emailForm.recipients === 'selected') {
      recipients = this.getSelectedAttendees();
    } else if (this.emailForm.recipients === 'filtered') {
      recipients = this.filteredAttendees;
    } else {
      recipients = this.allAttendees;
    }

    if (recipients.length === 0) {
      alert('Không có người nhận nào được chọn');
      this.isSendingEmail = false;
      return;
    }

    // TODO: Call backend API to send emails
    console.log('Sending bulk email to', recipients.length, 'recipients');
    console.log('Email data:', this.emailForm);
    console.log('Recipients:', recipients.map(r => r.email));

    // Simulate API call
    setTimeout(() => {
      this.isSendingEmail = false;
      alert(`Đã gửi email thành công đến ${recipients.length} người nhận!`);
      this.closeEmailModal();
    }, 2000);
  }

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

  getUniqueTicketTypes(): string[] {
    return Array.from(new Set(this.allAttendees.map(a => a.ticketType)));
  }
}

