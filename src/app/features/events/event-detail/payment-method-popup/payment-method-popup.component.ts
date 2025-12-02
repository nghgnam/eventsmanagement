import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

export type PaymentMethod = 'vnpay' | 'momo' | 'visa' | 'mastercard' | 'paypal';

export interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  icon: string;
  description: string;
  recommended?: boolean;
}

@Component({
  selector: 'app-payment-method-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-method-popup.component.html',
  styleUrls: ['./payment-method-popup.component.css']
})
export class PaymentMethodPopupComponent {
  @Input() totalAmount: number = 0;
  @Output() methodSelected = new EventEmitter<PaymentMethod>();
  @Output() cancelPaymentMethod = new EventEmitter<void>();

  selectedMethod = signal<PaymentMethod | null>(null);

  paymentMethods: PaymentMethodOption[] = [
    {
      id: 'vnpay',
      name: 'Ví/Thẻ nội địa',
      icon: 'fa-qrcode',
      description: 'Thanh toán qua VNPay, Momo, VietQR',
      recommended: true
    },
    {
      id: 'momo',
      name: 'Ví MoMo',
      icon: 'fa-mobile-alt',
      description: 'Thanh toán nhanh qua ví MoMo',
      recommended: true
    },
    {
      id: 'visa',
      name: 'Thẻ Visa',
      icon: 'fa-credit-card',
      description: 'Thanh toán qua thẻ Visa quốc tế'
    },
    {
      id: 'mastercard',
      name: 'Thẻ Mastercard',
      icon: 'fa-credit-card',
      description: 'Thanh toán qua thẻ Mastercard'
    },
    {
      id: 'paypal',
      name: 'PayPal',
      icon: 'fa-paypal',
      description: 'Thanh toán qua PayPal'
    }
  ];

  /**
   * Select payment method
   */
  selectMethod(method: PaymentMethod): void {
    this.selectedMethod.set(method);
  }

  /**
   * Proceed with selected payment method
   */
  proceed(): void {
    const method = this.selectedMethod();
    if (method) {
      this.methodSelected.emit(method);
    }
  }

  /**
   * Handle cancel
   */
  onCancel(): void {
    this.cancelPaymentMethod.emit();
  }

  /**
   * Check if can proceed
   */
  canProceed(): boolean {
    return this.selectedMethod() !== null;
  }
}

