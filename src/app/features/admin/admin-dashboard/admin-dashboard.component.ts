import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * Admin Dashboard Component
 * 
 * Overview statistics for platform administration
 */

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);

  // Statistics
  stats = {
    totalEvents: 0,
    pendingEvents: 0,
    totalUsers: 0,
    activeUsers: 0,
    blockedUsers: 0,
    totalRevenue: 0,
    pendingPayouts: 0,
    platformFee: 0
  };

  // Recent activities
  recentActivities: Array<{
    type: 'event' | 'user' | 'payout';
    action: string;
    description: string;
    timestamp: Date;
  }> = [];

  isLoading = false;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadDashboardData();
    }
  }

  loadDashboardData(): void {
    this.isLoading = true;
    // TODO: Load from backend API
    // Dummy data
    this.stats = {
      totalEvents: 1247,
      pendingEvents: 23,
      totalUsers: 8563,
      activeUsers: 7234,
      blockedUsers: 12,
      totalRevenue: 125000000,
      pendingPayouts: 45000000,
      platformFee: 12500000
    };

    this.recentActivities = [
      {
        type: 'event',
        action: 'pending',
        description: 'Sự kiện "Concert 2025" đang chờ duyệt',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        type: 'user',
        action: 'blocked',
        description: 'Tài khoản user@example.com đã bị khóa',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000)
      },
      {
        type: 'payout',
        action: 'requested',
        description: 'Yêu cầu rút tiền 5,000,000 VND từ Organizer ABC',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000)
      },
      {
        type: 'event',
        action: 'approved',
        description: 'Sự kiện "Workshop Tech" đã được duyệt',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000)
      }
    ];

    this.isLoading = false;
  }

  getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return `${minutes} phút trước`;
    } else if (hours < 24) {
      return `${hours} giờ trước`;
    } else {
      return `${days} ngày trước`;
    }
  }
}

