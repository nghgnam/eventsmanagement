import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EventList, EventTicketDefinition } from '../../../../core/models/eventstype';
import { SelectedTicket } from '../../../../core/services/order.service';

@Component({
  selector: 'app-ticket-selection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ticket-selection.component.html',
  styleUrls: ['./ticket-selection.component.css']
})
export class TicketSelectionComponent {
  @Input() event: EventList | null = null;
  @Output() ticketsSelected = new EventEmitter<SelectedTicket[]>();
  @Output() buyNow = new EventEmitter<SelectedTicket[]>();

  selectedTickets = signal<Map<string, SelectedTicket>>(new Map());
  totalPrice = signal<number>(0);

  /**
   * Get available tickets from catalog
   */
  get availableTickets(): EventTicketDefinition[] {
    return this.event?.tickets?.catalog || [];
  }

  /**
   * Increase ticket quantity
   */
  increaseQuantity(ticket: EventTicketDefinition): void {
    const ticketId = ticket.id || '';
    const current = this.selectedTickets();
    const selected = current.get(ticketId);
    const quantityAvailable = ticket.quantityAvailable ?? ticket.quantity ?? 0;
    const maxPerOrder = ticket.maxPerOrder ?? quantityAvailable;
    
    const currentQuantity = selected?.quantity || 0;
    
    // Check if can increase
    if (currentQuantity >= maxPerOrder) {
      return;
    }
    
    if (currentQuantity >= quantityAvailable) {
      return;
    }

    const newQuantity = currentQuantity + 1;
    const price = ticket.price || 0;
    const subtotal = price * newQuantity;

    const newMap = new Map(current);
    newMap.set(ticketId, {
      ticketId,
      ticketType: ticket,
      quantity: newQuantity,
      subtotal
    });

    this.selectedTickets.set(newMap);
    this.calculateTotal();
    this.emitTickets();
  }

  /**
   * Decrease ticket quantity
   */
  decreaseQuantity(ticket: EventTicketDefinition): void {
    const ticketId = ticket.id || '';
    const current = this.selectedTickets();
    const selected = current.get(ticketId);
    
    if (!selected || selected.quantity <= 0) {
      return;
    }

    const newQuantity = selected.quantity - 1;
    const price = ticket.price || 0;
    
    const newMap = new Map(current);
    
    if (newQuantity === 0) {
      newMap.delete(ticketId);
    } else {
      const subtotal = price * newQuantity;
      newMap.set(ticketId, {
        ticketId,
        ticketType: ticket,
        quantity: newQuantity,
        subtotal
      });
    }

    this.selectedTickets.set(newMap);
    this.calculateTotal();
    this.emitTickets();
  }

  /**
   * Get selected quantity for a ticket
   */
  getSelectedQuantity(ticketId: string | undefined): number {
    if (!ticketId) return 0;
    return this.selectedTickets().get(ticketId)?.quantity || 0;
  }

  /**
   * Check if ticket can be increased
   */
  canIncrease(ticket: EventTicketDefinition): boolean {
    const ticketId = ticket.id || '';
    const selected = this.selectedTickets().get(ticketId);
    const currentQuantity = selected?.quantity || 0;
    const quantityAvailable = ticket.quantityAvailable ?? ticket.quantity ?? 0;
    const maxPerOrder = ticket.maxPerOrder ?? quantityAvailable;
    
    return currentQuantity < Math.min(quantityAvailable, maxPerOrder);
  }

  /**
   * Check if ticket can be decreased
   */
  canDecrease(ticketId: string | undefined): boolean {
    if (!ticketId) return false;
    const selected = this.selectedTickets().get(ticketId);
    return (selected?.quantity || 0) > 0;
  }

  /**
   * Calculate total price
   */
  private calculateTotal(): void {
    const tickets = Array.from(this.selectedTickets().values());
    const total = tickets.reduce((sum, ticket) => sum + ticket.subtotal, 0);
    this.totalPrice.set(total);
  }

  /**
   * Emit selected tickets
   */
  private emitTickets(): void {
    const tickets = Array.from(this.selectedTickets().values());
    this.ticketsSelected.emit(tickets);
  }

  /**
   * Handle buy now button
   */
  onBuyNow(): void {
    const tickets = Array.from(this.selectedTickets().values());
    if (tickets.length > 0 && this.totalPrice() > 0) {
      this.buyNow.emit(tickets);
    }
  }

  /**
   * Get total quantity of all selected tickets
   */
  getTotalQuantity(): number {
    return Array.from(this.selectedTickets().values())
      .reduce((sum, ticket) => sum + ticket.quantity, 0);
  }

  /**
   * Check if buy now button should be enabled
   */
  canBuyNow(): boolean {
    return this.getTotalQuantity() > 0 && this.totalPrice() >= 0;
  }
}

