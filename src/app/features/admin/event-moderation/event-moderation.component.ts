import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

/**
 * Event Moderation Component
 *
 * Admin approves/rejects events before they go public
 */

export interface EventModeration {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date | string;
  reviewedAt?: Date | string;
  reviewedBy?: string;
  rejectionReason?: string;
  organizerName: string;
  startDate: Date | string;
  locationText: string;
  imageUrl: string;
}

@Component({
  selector: 'app-event-moderation',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './event-moderation.component.html',
  styleUrls: ['./event-moderation.component.css']
})
export class EventModerationComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);

  events: EventModeration[] = [];
  filteredEvents: EventModeration[] = [];

  // Filters
  filterStatus: 'all' | 'pending' | 'approved' | 'rejected' = 'pending';
  searchQuery = '';

  // Modals
  showRejectModal = false;
  selectedEvent: EventModeration | null = null;
  rejectionReason = '';

  isLoading = false;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadEvents();
    }
  }

  loadEvents(): void {
    this.isLoading = true;
    // TODO: Load from backend API
    // Dummy data
    this.events = [
      {
        id: 'e1',
        name: 'Concert 2025 - Summer Festival',
        description: 'Buổi hòa nhạc mùa hè lớn nhất năm',
        status: 'pending',
        submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        locationText: 'Sân vận động Quốc gia',
        organizerName: 'Event Organizer ABC',
        imageUrl: 'https://via.placeholder.com/400x300'
      } as EventModeration,
      {
        id: 'e2',
        name: 'Tech Workshop 2025',
        description: 'Workshop về công nghệ mới nhất',
        status: 'pending',
        submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        startDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        locationText: 'Trung tâm Hội nghị',
        organizerName: 'Tech Company XYZ',
        imageUrl: 'https://via.placeholder.com/400x300'
      } as EventModeration,
      {
        id: 'e3',
        name: 'Music Festival',
        description: 'Lễ hội âm nhạc',
        status: 'approved',
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        reviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        reviewedBy: 'admin@example.com',
        startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        locationText: 'Công viên Trung tâm',
        organizerName: 'Music Events Co.',
        imageUrl: 'https://via.placeholder.com/400x300'
      } as EventModeration,
      {
        id: 'e4',
        name: 'Spam Event',
        description: 'Nội dung spam',
        status: 'rejected',
        submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        reviewedBy: 'admin@example.com',
        rejectionReason: 'Nội dung vi phạm quy định của nền tảng',
        startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        locationText: 'N/A',
        organizerName: 'Spam Organizer',
        imageUrl: 'https://via.placeholder.com/400x300'
      } as EventModeration
    ];

    this.applyFilters();
    this.isLoading = false;
  }

  applyFilters(): void {
    let filtered = [...this.events];

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(query) ||
        e.organizerName.toLowerCase().includes(query) ||
        e.locationText.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(e => e.status === this.filterStatus);
    }

    this.filteredEvents = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  approveEvent(event: EventModeration): void {
    if (!confirm(`Bạn có chắc chắn muốn duyệt sự kiện "${event.name}"?`)) {
      return;
    }

    // TODO: Call backend API
    const index = this.events.findIndex(e => e.id === event.id);
    if (index !== -1) {
      this.events[index] = {
        ...this.events[index],
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: 'current-admin@example.com' // TODO: Get from auth
      };
    }

    this.applyFilters();
    console.log('Event approved:', event.id);
  }

  openRejectModal(event: EventModeration): void {
    this.selectedEvent = event;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedEvent = null;
    this.rejectionReason = '';
  }

  rejectEvent(): void {
    if (!this.selectedEvent || !this.rejectionReason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }

    // TODO: Call backend API
    const index = this.events.findIndex(e => e.id === this.selectedEvent!.id);
    if (index !== -1) {
      this.events[index] = {
        ...this.events[index],
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: 'current-admin@example.com', // TODO: Get from auth
        rejectionReason: this.rejectionReason
      };
    }

    this.applyFilters();
    this.closeRejectModal();
    console.log('Event rejected:', this.selectedEvent.id, this.rejectionReason);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'Chờ duyệt';
      case 'approved':
        return 'Đã duyệt';
      case 'rejected':
        return 'Đã từ chối';
      default:
        return status;
    }
  }
}

