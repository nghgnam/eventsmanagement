import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SelectedTicket } from '../../../../core/services/order.service';
import { EventList } from '../../../../core/models/eventstype';
import { UsersService } from '../../../../core/services/users.service';
import { AuthService } from '../../../../core/services/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';

@Component({
  selector: 'app-order-review-popup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './order-review-popup.component.html',
  styleUrls: ['./order-review-popup.component.css']
})
export class OrderReviewPopupComponent {
  @Input() event: EventList | null = null;
  @Input() selectedTickets: SelectedTicket[] = [];
  @Output() proceedToPayment = new EventEmitter<{
    buyerInfo: { fullName: string; email: string; phone: string };
    couponCode?: string;
  }>();
  @Output() cancelOrderReview = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  buyerForm: FormGroup;
  couponCode = signal<string>('');
  discount = signal<number>(0);

  constructor() {
    this.buyerForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]]
    });

    // Auto-fill if user is logged in
    this.loadUserInfo();
  }

  /**
   * Load user info if logged in
   */
  private loadUserInfo(): void {
    this.authService.onAuthStateChanged()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => {
        if (user?.uid) {
          this.usersService.getCurrentUserById(user.uid).subscribe(userData => {
            if (userData) {
              this.buyerForm.patchValue({
                fullName: userData.fullName || '',
                email: userData.email || '',
                phone: userData.phoneNumber || userData.contact?.phone || ''
              });
            }
          });
        }
      });
  }

  /**
   * Calculate subtotal
   */
  getSubtotal(): number {
    return this.selectedTickets.reduce((sum, ticket) => sum + ticket.subtotal, 0);
  }

  /**
   * Calculate total
   */
  getTotal(): number {
    return this.getSubtotal() - this.discount();
  }

  /**
   * Apply coupon code
   */
  applyCoupon(): void {
    const code = this.couponCode().trim();
    if (!code) return;
    
    // TODO: Call API to validate coupon
    // For now, just a placeholder
    console.log('Applying coupon:', code);
  }

  /**
   * Proceed to payment
   */
  onProceedToPayment(): void {
    if (this.buyerForm.invalid) {
      this.buyerForm.markAllAsTouched();
      return;
    }

    this.proceedToPayment.emit({
      buyerInfo: {
        fullName: this.buyerForm.value.fullName,
        email: this.buyerForm.value.email,
        phone: this.buyerForm.value.phone
      },
      couponCode: this.couponCode() || undefined
    });
  }

  /**
   * Handle cancel
   */
  onCancel(): void {
    this.cancelOrderReview.emit();
  }
}

