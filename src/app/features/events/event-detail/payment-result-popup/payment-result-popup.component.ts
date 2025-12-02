import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type PaymentResult = 'success' | 'failed' | 'cancelled';

@Component({
  selector: 'app-payment-result-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-result-popup.component.html',
  styleUrls: ['./payment-result-popup.component.css']
})
export class PaymentResultPopupComponent {
  @Input() result: PaymentResult = 'success';
  @Input() message: string = '';
  @Input() orderId: string = '';
  @Input() ticketQrCode?: string;
  @Output() closePaymentResult = new EventEmitter<void>();
  @Output() viewTickets = new EventEmitter<void>();
  @Output() goHome = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  /**
   * Handle close
   */
  onClose(): void {
    this.closePaymentResult.emit();
  }

  /**
   * Handle view tickets
   */
  onViewTickets(): void {
    this.viewTickets.emit();
  }

  /**
   * Handle go home
   */
  onGoHome(): void {
    this.goHome.emit();
  }

  /**
   * Handle retry
   */
  onRetry(): void {
    this.retry.emit();
  }

  /**
   * Get result icon
   */
  getResultIcon(): string {
    switch (this.result) {
      case 'success':
        return 'fa-check-circle';
      case 'failed':
        return 'fa-times-circle';
      case 'cancelled':
        return 'fa-ban';
      default:
        return 'fa-info-circle';
    }
  }

  /**
   * Get result title
   */
  getResultTitle(): string {
    switch (this.result) {
      case 'success':
        return 'Thanh toán thành công!';
      case 'failed':
        return 'Giao dịch không thành công';
      case 'cancelled':
        return 'Giao dịch đã bị hủy';
      default:
        return 'Thông báo';
    }
  }

  /**
   * Get default message
   */
  getDefaultMessage(): string {
    switch (this.result) {
      case 'success':
        return 'Vé đã được gửi về email của bạn. Vui lòng kiểm tra hộp thư.';
      case 'failed':
        return 'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.';
      case 'cancelled':
        return 'Bạn đã hủy giao dịch thanh toán.';
      default:
        return '';
    }
  }
}

