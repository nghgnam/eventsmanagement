import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { EventTicketDefinition } from '../models/eventstype';

export interface SelectedTicket {
  ticketId: string;
  ticketType: EventTicketDefinition;
  quantity: number;
  subtotal: number;
}

export interface OrderItem {
  ticketId: string;
  ticketName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface BuyerInfo {
  fullName: string;
  email: string;
  phone: string;
}

export interface Order {
  orderId?: string;
  eventId: string;
  eventName: string;
  items: OrderItem[];
  buyerInfo: BuyerInfo;
  couponCode?: string;
  discount?: number;
  subtotal: number;
  total: number;
  paymentMethod?: 'vnpay' | 'momo' | 'visa' | 'mastercard' | 'paypal';
  status?: 'pending' | 'paid' | 'failed' | 'cancelled';
  createdAt?: Date;
  expiresAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private platformId = inject(PLATFORM_ID);
  private readonly STORAGE_KEY = 'current_order';
  
  private currentOrder$ = new BehaviorSubject<Order | null>(null);
  
  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadOrderFromStorage();
    }
  }

  /**
   * Get current order as Observable
   */
  getCurrentOrder(): Observable<Order | null> {
    return this.currentOrder$.asObservable();
  }

  /**
   * Get current order value
   */
  getCurrentOrderValue(): Order | null {
    return this.currentOrder$.value;
  }

  /**
   * Create new order from selected tickets
   */
  createOrder(
    eventId: string,
    eventName: string,
    selectedTickets: SelectedTicket[],
    buyerInfo: BuyerInfo,
    couponCode?: string,
    discount?: number
  ): Order {
    const items: OrderItem[] = selectedTickets.map(ticket => ({
      ticketId: ticket.ticketId,
      ticketName: ticket.ticketType.name || 'General Admission',
      quantity: ticket.quantity,
      price: ticket.ticketType.price || 0,
      subtotal: ticket.subtotal
    }));

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const total = discount ? subtotal - discount : subtotal;

    const order: Order = {
      orderId: this.generateOrderId(),
      eventId,
      eventName,
      items,
      buyerInfo,
      couponCode,
      discount,
      subtotal,
      total,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };

    this.currentOrder$.next(order);
    this.saveOrderToStorage(order);
    
    return order;
  }

  /**
   * Update order payment method
   */
  updatePaymentMethod(orderId: string, method: Order['paymentMethod']): void {
    const order = this.currentOrder$.value;
    if (order && order.orderId === orderId) {
      order.paymentMethod = method;
      this.currentOrder$.next(order);
      this.saveOrderToStorage(order);
    }
  }

  /**
   * Update order status
   */
  updateOrderStatus(orderId: string, status: Order['status']): void {
    const order = this.currentOrder$.value;
    if (order && order.orderId === orderId) {
      order.status = status;
      this.currentOrder$.next(order);
      this.saveOrderToStorage(order);
    }
  }

  /**
   * Clear current order
   */
  clearOrder(): void {
    this.currentOrder$.next(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Save order to localStorage
   */
  private saveOrderToStorage(order: Order): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(order));
      } catch (error) {
        console.error('[OrderService] Failed to save order to storage:', error);
      }
    }
  }

  /**
   * Load order from localStorage
   */
  private loadOrderFromStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const order = JSON.parse(stored);
          // Check if order is expired
          if (order.expiresAt && new Date(order.expiresAt) > new Date()) {
            this.currentOrder$.next(order);
          } else {
            localStorage.removeItem(this.STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('[OrderService] Failed to load order from storage:', error);
        localStorage.removeItem(this.STORAGE_KEY);
      }
    }
  }

  /**
   * Generate unique order ID
   */
  private generateOrderId(): string {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Check if order is expired
   */
  isOrderExpired(order: Order): boolean {
    if (!order.expiresAt) return false;
    return new Date(order.expiresAt) <= new Date();
  }

  /**
   * Get remaining time in seconds
   */
  getRemainingTime(order: Order): number {
    if (!order.expiresAt) return 0;
    const remaining = new Date(order.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
  }
}

