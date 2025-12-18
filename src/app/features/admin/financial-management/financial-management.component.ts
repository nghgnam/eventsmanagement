import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

/**
 * Financial Management / Payouts Component
 * 
 * Admin manages financial transactions and payouts to organizers
 */

export interface PayoutRequest {
  id: string;
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  bankAccount: string;
  bankName: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date | string;
  processedAt?: Date | string;
  processedBy?: string;
  rejectionReason?: string;
  transactionId?: string;
}

export interface RevenueSummary {
  totalRevenue: number;
  platformFee: number;
  totalPayouts: number;
  pendingPayouts: number;
  platformProfit: number;
}

@Component({
  selector: 'app-financial-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './financial-management.component.html',
  styleUrls: ['./financial-management.component.css']
})
export class FinancialManagementComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);

  payoutRequests: PayoutRequest[] = [];
  filteredPayouts: PayoutRequest[] = [];
  revenueSummary: RevenueSummary = {
    totalRevenue: 0,
    platformFee: 0,
    totalPayouts: 0,
    pendingPayouts: 0,
    platformProfit: 0
  };

  // Filters
  filterStatus: 'all' | 'pending' | 'processing' | 'completed' | 'rejected' = 'pending';
  searchQuery = '';

  // Modals
  showProcessModal = false;
  showRejectModal = false;
  selectedPayout: PayoutRequest | null = null;
  transactionId = '';
  rejectionReason = '';

  isLoading = false;
  platformFeeRate = 0.1; // 10% platform fee

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadFinancialData();
    }
  }

  loadFinancialData(): void {
    this.isLoading = true;
    // TODO: Load from backend API
    // Dummy data
    this.payoutRequests = [
      {
        id: 'p1',
        organizerId: 'org1',
        organizerName: 'Event Organizer ABC',
        organizerEmail: 'organizer1@example.com',
        bankAccount: '1234567890',
        bankName: 'Vietcombank',
        amount: 5000000,
        platformFee: 500000,
        netAmount: 4500000,
        status: 'pending',
        requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'p2',
        organizerId: 'org2',
        organizerName: 'Tech Company XYZ',
        organizerEmail: 'organizer2@example.com',
        bankAccount: '9876543210',
        bankName: 'BIDV',
        amount: 10000000,
        platformFee: 1000000,
        netAmount: 9000000,
        status: 'pending',
        requestedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'p3',
        organizerId: 'org3',
        organizerName: 'Music Events Co.',
        organizerEmail: 'organizer3@example.com',
        bankAccount: '5555555555',
        bankName: 'Techcombank',
        amount: 3000000,
        platformFee: 300000,
        netAmount: 2700000,
        status: 'completed',
        requestedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        processedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        processedBy: 'admin@example.com',
        transactionId: 'TXN123456789'
      }
    ];

    this.calculateSummary();
    this.applyFilters();
    this.isLoading = false;
  }

  calculateSummary(): void {
    this.revenueSummary = {
      totalRevenue: this.payoutRequests.reduce((sum, p) => sum + p.amount, 0),
      platformFee: this.payoutRequests.reduce((sum, p) => sum + p.platformFee, 0),
      totalPayouts: this.payoutRequests
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.netAmount, 0),
      pendingPayouts: this.payoutRequests
        .filter(p => p.status === 'pending' || p.status === 'processing')
        .reduce((sum, p) => sum + p.netAmount, 0),
      platformProfit: 0
    };
    this.revenueSummary.platformProfit = this.revenueSummary.platformFee - this.revenueSummary.totalPayouts;
  }

  applyFilters(): void {
    let filtered = [...this.payoutRequests];

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.organizerName.toLowerCase().includes(query) ||
        p.organizerEmail.toLowerCase().includes(query) ||
        p.bankAccount.includes(query)
      );
    }

    // Status filter
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === this.filterStatus);
    }

    this.filteredPayouts = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  openProcessModal(payout: PayoutRequest): void {
    this.selectedPayout = payout;
    this.transactionId = '';
    this.showProcessModal = true;
  }

  closeProcessModal(): void {
    this.showProcessModal = false;
    this.selectedPayout = null;
    this.transactionId = '';
  }

  processPayout(): void {
    if (!this.selectedPayout || !this.transactionId.trim()) {
      alert('Vui lòng nhập mã giao dịch');
      return;
    }

    // TODO: Call backend API
    const index = this.payoutRequests.findIndex(p => p.id === this.selectedPayout!.id);
    if (index !== -1) {
      this.payoutRequests[index] = {
        ...this.payoutRequests[index],
        status: 'completed',
        processedAt: new Date(),
        processedBy: 'current-admin@example.com', // TODO: Get from auth
        transactionId: this.transactionId
      };
    }

    this.calculateSummary();
    this.applyFilters();
    this.closeProcessModal();
    console.log('Payout processed:', this.selectedPayout.id, this.transactionId);
  }

  openRejectModal(payout: PayoutRequest): void {
    this.selectedPayout = payout;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedPayout = null;
    this.rejectionReason = '';
  }

  rejectPayout(): void {
    if (!this.selectedPayout || !this.rejectionReason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }

    // TODO: Call backend API
    const index = this.payoutRequests.findIndex(p => p.id === this.selectedPayout!.id);
    if (index !== -1) {
      this.payoutRequests[index] = {
        ...this.payoutRequests[index],
        status: 'rejected',
        processedAt: new Date(),
        processedBy: 'current-admin@example.com', // TODO: Get from auth
        rejectionReason: this.rejectionReason
      };
    }

    this.calculateSummary();
    this.applyFilters();
    this.closeRejectModal();
    console.log('Payout rejected:', this.selectedPayout.id, this.rejectionReason);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'completed':
        return 'status-completed';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'Chờ xử lý';
      case 'processing':
        return 'Đang xử lý';
      case 'completed':
        return 'Hoàn thành';
      case 'rejected':
        return 'Đã từ chối';
      default:
        return status;
    }
  }
}

