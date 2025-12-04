import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

/**
 * Coupon Management Component
 * 
 * Features:
 * - Create coupon codes
 * - Discount types: Percentage or Fixed amount
 * - Usage limits
 * - Expiration dates
 * - List and manage coupons
 * - Usage statistics
 */

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number; // Percentage (0-100) or Fixed amount (VND)
  eventId?: string; // Optional: specific to an event
  usageLimit?: number; // Optional: max number of uses
  usedCount: number;
  minPurchaseAmount?: number; // Optional: minimum order amount to apply
  startDate: Date | string;
  endDate: Date | string;
  isActive: boolean;
  createdAt: Date | string;
  description?: string;
}

@Component({
  selector: 'app-coupon-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './coupon-management.component.html',
  styleUrls: ['./coupon-management.component.css']
})
export class CouponManagementComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  eventId: string | null = null; // Optional: if managing coupons for a specific event

  // Coupons list
  coupons: Coupon[] = [];
  filteredCoupons: Coupon[] = [];

  // Form
  showCreateModal = false;
  editingCoupon: Coupon | null = null;
  couponForm: FormGroup;

  // Filters
  filterStatus: 'all' | 'active' | 'expired' | 'inactive' = 'all';
  searchQuery = '';

  // Stats
  totalCoupons = 0;
  activeCoupons = 0;
  totalUses = 0;
  totalDiscountGiven = 0;

  isLoading = false;

  constructor() {
    this.couponForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      type: ['percentage', Validators.required],
      value: [0, [Validators.required, Validators.min(0)]],
      eventId: [null],
      usageLimit: [null],
      minPurchaseAmount: [null],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      isActive: [true],
      description: ['']
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.route.paramMap.subscribe(params => {
        this.eventId = params.get('eventId');
        if (this.eventId) {
          this.couponForm.patchValue({ eventId: this.eventId });
        }
        this.loadCoupons();
      });
    }
  }

  loadCoupons(): void {
    this.isLoading = true;
    // TODO: Load from backend API
    // Dummy data for UI
    this.coupons = [
      {
        id: 'c1',
        code: 'SUMMER2025',
        type: 'percentage',
        value: 20,
        eventId: this.eventId || undefined,
        usageLimit: 100,
        usedCount: 45,
        minPurchaseAmount: 100000,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        description: 'Giảm 20% cho mùa hè 2025'
      },
      {
        id: 'c2',
        code: 'FLAT50K',
        type: 'fixed',
        value: 50000,
        eventId: this.eventId || undefined,
        usageLimit: 50,
        usedCount: 32,
        minPurchaseAmount: 200000,
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        isActive: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        description: 'Giảm 50,000 VND cho đơn hàng từ 200,000 VND'
      },
      {
        id: 'c3',
        code: 'EARLYBIRD',
        type: 'percentage',
        value: 15,
        usageLimit: 200,
        usedCount: 200,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        isActive: false,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        description: 'Mã đã hết hạn và đã sử dụng hết'
      }
    ];

    this.updateStats();
    this.applyFilters();
    this.isLoading = false;
  }

  updateStats(): void {
    this.totalCoupons = this.coupons.length;
    this.activeCoupons = this.coupons.filter(c => c.isActive && this.isCouponValid(c)).length;
    this.totalUses = this.coupons.reduce((sum, c) => sum + c.usedCount, 0);
    // TODO: Calculate total discount given from actual usage data
    this.totalDiscountGiven = 0;
  }

  isCouponValid(coupon: Coupon): boolean {
    const now = new Date();
    const startDate = coupon.startDate instanceof Date ? coupon.startDate : new Date(coupon.startDate);
    const endDate = coupon.endDate instanceof Date ? coupon.endDate : new Date(coupon.endDate);
    
    if (now < startDate || now > endDate) return false;
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return false;
    return true;
  }

  applyFilters(): void {
    let filtered = [...this.coupons];

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.code.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(c => {
        if (this.filterStatus === 'active') {
          return c.isActive && this.isCouponValid(c);
        } else if (this.filterStatus === 'expired') {
          const endDate = c.endDate instanceof Date ? c.endDate : new Date(c.endDate);
          return endDate < new Date() || (c.usageLimit && c.usedCount >= c.usageLimit);
        } else if (this.filterStatus === 'inactive') {
          return !c.isActive;
        }
        return true;
      });
    }

    this.filteredCoupons = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  openCreateModal(): void {
    this.editingCoupon = null;
    this.couponForm.reset({
      type: 'percentage',
      value: 0,
      eventId: this.eventId || null,
      usageLimit: null,
      minPurchaseAmount: null,
      startDate: '',
      endDate: '',
      isActive: true,
      description: ''
    });
    this.showCreateModal = true;
  }

  openEditModal(coupon: Coupon): void {
    this.editingCoupon = coupon;
    this.couponForm.patchValue({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      eventId: coupon.eventId || null,
      usageLimit: coupon.usageLimit || null,
      minPurchaseAmount: coupon.minPurchaseAmount || null,
      startDate: coupon.startDate instanceof Date 
        ? coupon.startDate.toISOString().split('T')[0]
        : new Date(coupon.startDate).toISOString().split('T')[0],
      endDate: coupon.endDate instanceof Date
        ? coupon.endDate.toISOString().split('T')[0]
        : new Date(coupon.endDate).toISOString().split('T')[0],
      isActive: coupon.isActive,
      description: coupon.description || ''
    });
    this.showCreateModal = true;
  }

  closeModal(): void {
    this.showCreateModal = false;
    this.editingCoupon = null;
    this.couponForm.reset();
  }

  onTypeChange(): void {
    const type = this.couponForm.get('type')?.value;
    const valueControl = this.couponForm.get('value');
    
    if (type === 'percentage') {
      valueControl?.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
    } else {
      valueControl?.setValidators([Validators.required, Validators.min(0)]);
    }
    valueControl?.updateValueAndValidity();
  }

  saveCoupon(): void {
    if (this.couponForm.invalid) {
      this.couponForm.markAllAsTouched();
      return;
    }

    const formValue = this.couponForm.value;
    const startDate = new Date(formValue.startDate);
    const endDate = new Date(formValue.endDate);

    if (endDate <= startDate) {
      alert('Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }

    if (this.editingCoupon) {
      // Update existing coupon
      const index = this.coupons.findIndex(c => c.id === this.editingCoupon!.id);
      if (index !== -1) {
        this.coupons[index] = {
          ...this.editingCoupon,
          ...formValue,
          startDate,
          endDate,
          createdAt: this.editingCoupon.createdAt
        };
      }
    } else {
      // Create new coupon
      const newCoupon: Coupon = {
        id: 'c' + Date.now(),
        code: formValue.code.toUpperCase(),
        type: formValue.type,
        value: formValue.value,
        eventId: formValue.eventId || undefined,
        usageLimit: formValue.usageLimit || undefined,
        usedCount: 0,
        minPurchaseAmount: formValue.minPurchaseAmount || undefined,
        startDate,
        endDate,
        isActive: formValue.isActive,
        createdAt: new Date(),
        description: formValue.description || undefined
      };
      this.coupons.unshift(newCoupon);
    }

    this.updateStats();
    this.applyFilters();
    this.closeModal();
    
    // TODO: Call backend API to save coupon
    console.log('Saving coupon:', this.editingCoupon ? 'Update' : 'Create', formValue);
  }

  deleteCoupon(coupon: Coupon): void {
    if (!confirm(`Bạn có chắc chắn muốn xóa mã giảm giá "${coupon.code}"?`)) {
      return;
    }

    const index = this.coupons.findIndex(c => c.id === coupon.id);
    if (index !== -1) {
      this.coupons.splice(index, 1);
      this.updateStats();
      this.applyFilters();
    }

    // TODO: Call backend API to delete coupon
    console.log('Deleting coupon:', coupon.id);
  }

  toggleCouponStatus(coupon: Coupon): void {
    coupon.isActive = !coupon.isActive;
    this.updateStats();
    this.applyFilters();
    
    // TODO: Call backend API to update coupon status
    console.log('Toggling coupon status:', coupon.id, coupon.isActive);
  }

  getCouponStatus(coupon: Coupon): 'active' | 'expired' | 'inactive' | 'used-up' {
    if (!coupon.isActive) return 'inactive';
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return 'used-up';
    const endDate = coupon.endDate instanceof Date ? coupon.endDate : new Date(coupon.endDate);
    if (endDate < new Date()) return 'expired';
    return 'active';
  }

  getCouponDisplayValue(coupon: Coupon): string {
    if (coupon.type === 'percentage') {
      return `${coupon.value}%`;
    } else {
      return `${coupon.value.toLocaleString('vi-VN')} VND`;
    }
  }

  copyCouponCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      // TODO: Show toast notification
      console.log('Copied to clipboard:', code);
    });
  }
}


