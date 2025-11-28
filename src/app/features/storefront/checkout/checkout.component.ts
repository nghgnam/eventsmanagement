import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

/**
 * Checkout Component
 * 
 * Features:
 * - Review order summary
 * - Apply voucher/coupon
 * - Payment gateway integration (VNPay/Momo/Stripe)
 * - Handle IPN (Instant Payment Notification)
 * 
 * Payment Flow:
 * 1. User reviews order
 * 2. Apply voucher (optional)
 * 3. Select payment method
 * 4. Redirect to payment gateway
 * 5. Handle callback from payment gateway
 */
interface OrderItemSummary {
  id: string;
  ticketType: string;
  quantity: number;
  price: number;
}

interface OrderSummary {
  items: OrderItemSummary[];
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  orderSummary: OrderSummary | null = null;
  voucherForm: FormGroup;
  paymentForm: FormGroup;
  
  // Payment methods
  paymentMethods = [
    { id: 'vnpay', name: 'VNPay', icon: 'vnpay-icon' },
    { id: 'momo', name: 'MoMo', icon: 'momo-icon' },
    { id: 'stripe', name: 'Stripe', icon: 'stripe-icon' }
  ];

  selectedPaymentMethod = '';
  voucherCode = '';
  voucherDiscount = 0;
  subtotal = 0;
  total = 0;

  constructor() {
    this.voucherForm = this.fb.group({
      code: ['']
    });

    this.paymentForm = this.fb.group({
      paymentMethod: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // TODO: Load order from route params
      // TODO: Calculate totals
    }
  }

  /**
   * Apply voucher code
   */
  applyVoucher(): void {
    const code = this.voucherForm.get('code')?.value;
    if (!code) return;

    // TODO: Validate voucher code via API
    // TODO: Calculate discount
    // TODO: Update total
  }

  /**
   * Process payment
   */
  processPayment(): void {
    if (this.paymentForm.invalid) {
      return;
    }

    // TODO: Create order in database
    // TODO: Generate payment URL based on method
    // TODO: Redirect to payment gateway
    // TODO: Handle payment callback
  }

  /**
   * Calculate totals
   */
  calculateTotals(): void {
    // TODO: Calculate subtotal from tickets
    // TODO: Apply voucher discount
    // TODO: Calculate final total
  }
}


