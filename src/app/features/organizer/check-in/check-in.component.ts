import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TimestampLike } from '../../../core/models/eventstype';

/**
 * Check-in System Component
 * 
 * Features:
 * - QR code scanner for tickets
 * - Real-time sync to prevent duplicate check-ins
 * - Mobile optimized
 * - Manual check-in option
 * 
 * Use Cases:
 * - Staff scans QR code at event entrance
 * - System validates ticket and checks in attendee
 * - Real-time update to prevent same ticket being checked in twice
 */

interface CheckInEvent {
  name?: string;
  startDate?: TimestampLike;
  [key: string]: unknown;
}

@Component({
  selector: 'app-check-in',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './check-in.component.html',
  styleUrls: ['./check-in.component.css']
})
export class CheckInComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  eventId: string = '';
  event: CheckInEvent | null = null;
  
  // Scanner state
  isScanning = false;
  scannerError: string | null = null;
  
  // Manual check-in
  ticketCode = '';
  searchName = '';
  searchPhone = '';
  isProcessing = false;
  
  // Recent check-ins
  recentCheckIns: {
    id: string;
    attendeeName: string;
    ticketType: string;
    checkInTime: string | Date;
  }[] = [];

  // Manual search results (dummy data for UI)
  manualResults: {
    id: string;
    attendeeName: string;
    phone: string;
    ticketType: string;
    status: 'not_checked_in' | 'checked_in';
  }[] = [];

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // TODO: Get event ID from route
      // TODO: Load event details
      // TODO: Initialize QR scanner
      // TODO: Load recent check-ins
    }
  }

  /**
   * Start QR code scanner
   */
  startScanner(): void {
    // TODO: Initialize QR scanner (ngx-scanner or similar)
    // TODO: Handle scan results
    this.isScanning = true;
  }

  /**
   * Stop QR code scanner
   */
  stopScanner(): void {
    this.isScanning = false;
    // TODO: Stop scanner
  }

  /**
   * Handle QR code scan result
   */
  onQRCodeScanned(_qrData: string): void {
    // TODO: Parse QR code data
    // TODO: Validate ticket
    // TODO: Check if already checked in (real-time check)
    // TODO: Process check-in
    // TODO: Show success/error message
    // TODO: Add to recent check-ins
  }

  /**
   * Manual check-in by ticket code
   */
  manualCheckIn(): void {
    if (!this.ticketCode) {
      return;
    }

    this.isProcessing = true;
    // TODO: Validate ticket code
    // TODO: Check if already checked in
    // TODO: Process check-in
    // TODO: Show success/error message
    // TODO: Clear input
    this.isProcessing = false;
  }

  /**
   * Manual search by name / phone
   */
  searchAttendee(): void {
    if (!this.searchName && !this.searchPhone) {
      return;
    }

    // TODO: Call backend to search attendees
    // Dummy data for UI demonstration
    this.manualResults = [
      {
        id: 't-001',
        attendeeName: 'Nguyễn Văn A',
        phone: '0901 234 567',
        ticketType: 'Standard',
        status: 'not_checked_in'
      },
      {
        id: 't-002',
        attendeeName: 'Trần Thị B',
        phone: '0902 345 678',
        ticketType: 'VIP',
        status: 'checked_in'
      }
    ];
  }

  clearSearch(): void {
    this.searchName = '';
    this.searchPhone = '';
    this.manualResults = [];
  }

  /**
   * Process check-in (shared logic)
   */
  private processCheckIn(_ticketId: string): void {
    // TODO: Call API to check in ticket
    // TODO: Real-time sync to prevent duplicates
    // TODO: Update UI
  }

  /**
   * Remove gallery image
   */
  removeGalleryImage(_index: number): void {
    // TODO: Remove image from gallery
  }

  /**
   * Convert TimestampLike to Date for date pipe
   */
  getEventDate(timestamp?: TimestampLike): Date | null {
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

