import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

/**
 * User Management Component
 * 
 * Admin manages users: block/unblock accounts, view user details
 */

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'organizer' | 'admin';
  isActive: boolean;
  isBlocked: boolean;
  createdAt: Date | string;
  lastLoginAt?: Date | string;
  totalEvents?: number;
  totalTickets?: number;
  blockReason?: string;
  blockedAt?: Date | string;
  blockedBy?: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);

  users: AdminUser[] = [];
  filteredUsers: AdminUser[] = [];

  // Filters
  filterStatus: 'all' | 'active' | 'blocked' = 'all';
  filterRole: 'all' | 'user' | 'organizer' | 'admin' = 'all';
  searchQuery = '';

  // Modals
  showBlockModal = false;
  showUnblockModal = false;
  selectedUser: AdminUser | null = null;
  blockReason = '';

  isLoading = false;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUsers();
    }
  }

  loadUsers(): void {
    this.isLoading = true;
    // TODO: Load from backend API
    // Dummy data
    this.users = [
      {
        id: 'u1',
        email: 'user1@example.com',
        displayName: 'Nguyễn Văn A',
        role: 'user',
        isActive: true,
        isBlocked: false,
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        totalTickets: 15
      },
      {
        id: 'u2',
        email: 'organizer1@example.com',
        displayName: 'Event Organizer ABC',
        role: 'organizer',
        isActive: true,
        isBlocked: false,
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        totalEvents: 12
      },
      {
        id: 'u3',
        email: 'spam@example.com',
        displayName: 'Spam User',
        role: 'user',
        isActive: false,
        isBlocked: true,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        blockReason: 'Vi phạm quy định: Spam nội dung',
        blockedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        blockedBy: 'admin@example.com'
      },
      {
        id: 'u4',
        email: 'admin@example.com',
        displayName: 'System Admin',
        role: 'admin',
        isActive: true,
        isBlocked: false,
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        lastLoginAt: new Date(Date.now() - 30 * 60 * 1000)
      }
    ];

    this.applyFilters();
    this.isLoading = false;
  }

  applyFilters(): void {
    let filtered = [...this.users];

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(query) ||
        u.displayName.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(u => {
        if (this.filterStatus === 'active') {
          return !u.isBlocked && u.isActive;
        } else if (this.filterStatus === 'blocked') {
          return u.isBlocked;
        }
        return true;
      });
    }

    // Role filter
    if (this.filterRole !== 'all') {
      filtered = filtered.filter(u => u.role === this.filterRole);
    }

    this.filteredUsers = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  openBlockModal(user: AdminUser): void {
    this.selectedUser = user;
    this.blockReason = '';
    this.showBlockModal = true;
  }

  closeBlockModal(): void {
    this.showBlockModal = false;
    this.selectedUser = null;
    this.blockReason = '';
  }

  blockUser(): void {
    if (!this.selectedUser || !this.blockReason.trim()) {
      alert('Vui lòng nhập lý do khóa tài khoản');
      return;
    }

    // TODO: Call backend API
    const index = this.users.findIndex(u => u.id === this.selectedUser!.id);
    if (index !== -1) {
      this.users[index] = {
        ...this.users[index],
        isBlocked: true,
        isActive: false,
        blockReason: this.blockReason,
        blockedAt: new Date(),
        blockedBy: 'current-admin@example.com' // TODO: Get from auth
      };
    }

    this.applyFilters();
    this.closeBlockModal();
    console.log('User blocked:', this.selectedUser.id, this.blockReason);
  }

  openUnblockModal(user: AdminUser): void {
    this.selectedUser = user;
    this.showUnblockModal = true;
  }

  closeUnblockModal(): void {
    this.showUnblockModal = false;
    this.selectedUser = null;
  }

  unblockUser(): void {
    if (!this.selectedUser) return;

    // TODO: Call backend API
    const index = this.users.findIndex(u => u.id === this.selectedUser!.id);
    if (index !== -1) {
      this.users[index] = {
        ...this.users[index],
        isBlocked: false,
        isActive: true,
        blockReason: undefined,
        blockedAt: undefined,
        blockedBy: undefined
      };
    }

    this.applyFilters();
    this.closeUnblockModal();
    console.log('User unblocked:', this.selectedUser.id);
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'admin':
        return 'role-admin';
      case 'organizer':
        return 'role-organizer';
      case 'user':
        return 'role-user';
      default:
        return '';
    }
  }

  getRoleText(role: string): string {
    switch (role) {
      case 'admin':
        return 'Quản trị viên';
      case 'organizer':
        return 'Tổ chức';
      case 'user':
        return 'Người dùng';
      default:
        return role;
    }
  }
}

