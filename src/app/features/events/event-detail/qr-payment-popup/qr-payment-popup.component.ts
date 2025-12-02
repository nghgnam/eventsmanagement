import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject, signal } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { OrderService } from '../../../../core/services/order.service';

@Component({
  selector: 'app-qr-payment-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qr-payment-popup.component.html',
  styleUrls: ['./qr-payment-popup.component.css']
})
export class QRPaymentPopupComponent implements OnInit, OnDestroy {
  @Input() orderId: string = '';
  @Input() amount: number = 0;
  @Output() paymentConfirmed = new EventEmitter<void>();
  @Output() cancelPayment = new EventEmitter<void>();

  private orderService = inject(OrderService);

  qrCodeUrl = signal<string>('');
  bankAccount = signal<string>('970422');
  bankName = signal<string>('Vietcombank');
  accountNumber = signal<string>('1234567890');
  accountName = signal<string>('DONATE BLOOD PROJECT');
  paymentContent = signal<string>('');
  remainingTime = signal<number>(600); // 10 minutes in seconds
  paymentStatus = signal<'pending' | 'paid' | 'expired'>('pending');
  
  private countdownSubscription?: Subscription;
  private pollingSubscription?: Subscription;

  ngOnInit(): void {
    this.generateQRCode();
    this.startCountdown();
    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  /**
   * Generate QR code (placeholder - should call backend API)
   */
  private generateQRCode(): void {
    // TODO: Call backend API to generate QR code
    // For now, use a placeholder QR code generator service
    const qrData = `vietqr://${this.bankAccount()}/${this.accountNumber()}?amount=${this.amount}&content=${this.orderId}`;
    // In production, use a QR code library or API
    this.qrCodeUrl.set(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`);
    this.paymentContent.set(this.orderId);
  }

  /**
   * Start countdown timer
   */
  private startCountdown(): void {
    this.countdownSubscription = interval(1000).subscribe(() => {
      const remaining = this.remainingTime();
      if (remaining > 0) {
        this.remainingTime.set(remaining - 1);
      } else {
        this.paymentStatus.set('expired');
        if (this.countdownSubscription) {
          this.countdownSubscription.unsubscribe();
        }
      }
    });
  }

  /**
   * Start polling payment status
   */
  private startPolling(): void {
    // Poll every 5 seconds
    this.pollingSubscription = interval(5000).subscribe(() => {
      if (this.paymentStatus() === 'pending') {
        this.checkPaymentStatus();
      }
    });
  }

  /**
   * Check payment status from backend
   */
  private checkPaymentStatus(): void {
    // TODO: Call backend API to check payment status
    // For now, just a placeholder
    const order = this.orderService.getCurrentOrderValue();
    if (order && order.status === 'paid') {
      this.paymentStatus.set('paid');
      this.paymentConfirmed.emit();
    }
  }

  /**
   * Format time as MM:SS
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Copy account number
   */
  copyAccountNumber(): void {
    navigator.clipboard.writeText(this.accountNumber()).then(() => {
      // Show toast notification
      console.log('Account number copied!');
    });
  }

  /**
   * Copy payment content
   */
  copyPaymentContent(): void {
    navigator.clipboard.writeText(this.paymentContent()).then(() => {
      // Show toast notification
      console.log('Payment content copied!');
    });
  }

  /**
   * Handle manual payment confirmation
   */
  onPaymentConfirmed(): void {
    // TODO: Call backend API to confirm payment
    this.paymentStatus.set('paid');
    this.paymentConfirmed.emit();
  }

  /**
   * Handle cancel
   */
  onCancel(): void {
    this.cancelPayment.emit();
  }
}

