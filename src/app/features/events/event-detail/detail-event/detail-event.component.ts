import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable, Subject, Subscription } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { EventList } from '../../../../core/models/eventstype';
import { EventsService } from '../../../../core/services/events.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SafeUrlService } from '../../../../core/services/santizer.service';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { TicketService } from '../../../../core/services/ticket.service';
import { ImageErrorHandlerDirective } from '../../../../shared/directives/image-error-handler.directive';
import { TicketSelectionComponent } from '../ticket-selection/ticket-selection.component';
import { OrderReviewPopupComponent } from '../order-review-popup/order-review-popup.component';
import { PaymentMethodPopupComponent, PaymentMethod } from '../payment-method-popup/payment-method-popup.component';
import { QRPaymentPopupComponent } from '../qr-payment-popup/qr-payment-popup.component';
import { PaymentResultPopupComponent, PaymentResult } from '../payment-result-popup/payment-result-popup.component';
import { PopupComponent } from '../../../../shared/components/popup/popup.component';
import { OrderService, SelectedTicket } from '../../../../core/services/order.service';
import { SelectedTicket as SelectedTicketType } from '../../../../core/services/order.service';

@Component({
  selector: 'app-detail-event',
  standalone: true,
  imports: [
    CommonModule, 
    ImageErrorHandlerDirective,
    TicketSelectionComponent,
    OrderReviewPopupComponent,
    PaymentMethodPopupComponent,
    QRPaymentPopupComponent,
    PaymentResultPopupComponent,
    PopupComponent
  ],
  templateUrl: './detail-event.component.html',
  styleUrls: ['./detail-event.component.css']
})
export class DetailEventComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private eventsService = inject(EventsService);
  private router = inject(Router);
  private sanitizer = inject(SafeUrlService);
  private subscript = inject(SubscriptionService);
  private ticketsService = inject(TicketService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private orderService = inject(OrderService);

  event: EventList | undefined | null = null;
  events$: Observable<EventList[]> | undefined;
  showStartTime: string | undefined;
  showEndTime: string | undefined;
  isClickActive: number | null = null;
  activeBorder: number | null = null;
  totalTicket = 1;
  isHidden: boolean = true;
  totalPrice: number | null = null;
  subscribers: number | null = null;
  hasSubscribes: boolean = false;
  hasFollow: boolean = false;
  isOrganizer: boolean = false;
  private currentEventId: string | null = null;
  private currentUserId: string | null = null;
  private lastLoadedKey: string | null = null;
  organizerId: string = '';
  isEventFull: boolean = false;
  private destroy$ = new Subject<void>();
  showUnsubscribeDialog: boolean = false;

  // Notification state
  showNotification: boolean = false;
  notificationMessage: string = '';
  notificationType: 'success' | 'error' = 'success';

  // Ticket purchase flow state
  selectedTickets: SelectedTicket[] = [];
  showOrderReviewPopup = false;
  showPaymentMethodPopup = false;
  showQRPaymentPopup = false;
  showPaymentResultPopup = false;
  paymentResult: PaymentResult = 'success';
  paymentResultMessage = '';
  currentOrderId = '';

  // Getter for total amount
  get totalAmount(): number {
    return this.selectedTickets.reduce((sum, t) => sum + t.subtotal, 0);
  }

  private subscriptions: Subscription[] = [];

  constructor() {
    this.events$ = this.eventsService.events$;
  }
  ngOnInit() {
    this.subscriptions.push(
      this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
        this.currentEventId = params.get('id');
        this.tryLoadEventData();
      })
    );

    this.subscriptions.push(
      this.authService.onAuthStateChanged().subscribe(user => {
        this.currentUserId = user?.uid ?? null;
        this.tryLoadEventData();
      })
    );
  }

  private tryLoadEventData(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const eventId = this.currentEventId;
    const userId = this.currentUserId;
    if (!eventId || !userId) {
      return;
    }
    const key = `${eventId}_${userId}`;
    if (this.lastLoadedKey === key) {
      return;
    }
    this.lastLoadedKey = key;
    const eventSub = this.eventsService.getEventById(eventId).subscribe({
          next: (event) => {
            this.event = event;
            const organizerId = event?.organizer?.id;

            this.subscript.checkEventFull(eventId).subscribe(isFull => {
              this.isEventFull = isFull;
              console.log('Event full status:', isFull);
              if (isFull) {
                this.showNotification = true;
                this.notificationMessage = 'Sự kiện đã đủ người tham dự!';
                this.notificationType = 'error';
                setTimeout(() => this.showNotification = false, 3000);
              }
            });

            
            if (!this.showStartTime && !this.showEndTime) {
              this.showStartTime = this.event?.date_time_options[0]?.start_time;
              this.showEndTime = this.event?.date_time_options[0]?.end_time;
              this.totalPrice = (this.event?.price ?? 0) * 1;
            }

            
            if (organizerId && userId) {
              this.subscript.checkFollowStatus(userId, organizerId as string).subscribe(isFollowing => {
                this.hasFollow = isFollowing;
                console.log('Follow status:', isFollowing);
              });

              
              forkJoin({
                subscriberCount: this.subscript.getSubscriberCount(eventId),
                followerCount: this.subscript.getAllFollower(userId, organizerId as string)
              }).subscribe({
                next: ({ subscriberCount, followerCount }) => {
                  if (subscriberCount !== -1) {
                    this.subscribers = subscriberCount;
                    console.log('Subscriber count:', subscriberCount);
                  } else {
                    console.warn('Unable to fetch subscriber count');
                  }

                  if (followerCount !== -1) {
                    if (this.event?.organizer) {
                      this.event.organizer.followers = followerCount;
                      this.hasFollow = followerCount > 0;
                    }
                  } else {
                    console.warn('Unable to fetch follower count');
                  }
                },
                error: (error) => {
                  console.error('Error fetching subscriber or follower count:', error);
                }
              });

              
              this.subscript.getEventAndUserHasSubs(userId, eventId);
              const currentSubSub = this.subscript.getCurrentSub$.pipe(takeUntil(this.destroy$)).subscribe({
                next: (sub) => {
                  console.log('Received subscription data:', sub);
                  this.hasSubscribes = Array.isArray(sub) && sub.length > 0;
                  console.log('Updated subscription status:', this.hasSubscribes);
                },
                error: (error) => {
                  console.error('Subscription error:', error);
                  this.hasSubscribes = false;
                }
              });
              this.subscriptions.push(currentSubSub);
            }
          },
          error: (error) => {
            console.error('Error fetching event details:', error);
          }
        });
    this.subscriptions.push(eventSub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getSafeUrl(url: string | null | undefined, isAvatar: boolean = false): string {
    return this.sanitizer.getSafeUrl(url, isAvatar);
  }

  getDefaultImageUrl(): string {
    return this.sanitizer.DEFAULT_IMAGE_URL;
  }

  getDatetimeClick(index: number) {
    this.isClickActive = index;
    this.activeBorder = index;
    this.showStartTime = this.event?.date_time_options[index]?.start_time;
    this.showEndTime = this.event?.date_time_options[index]?.end_time;
  }

  goToDetail(eventId: string | undefined) {
    if (eventId) {
      this.router.navigate(['/detail', eventId]);
    }
  }

  /**
   * Get other events from the same organizer
   */
  getOtherEventsFromOrganizer(events: EventList[] | null | undefined): EventList[] {
    if (!events || !this.event?.organizer) {
      return [];
    }
    const currentOrganizerName = this.event.organizer.name;
    const currentEventId = this.event.id;
    return events.filter(e => 
      e.organizer && 
      e.organizer.name === currentOrganizerName && 
      e.id !== currentEventId
    );
  }

  inCreaseTicket() {
    // Nếu event free, chỉ cho phép 1 ticket
    if (this.event?.price === 0 || !this.event?.price) {
      this.showError('Sự kiện miễn phí chỉ cho phép đăng ký 1 vé!');
      return;
    }
    this.totalTicket += 1;
    this.totalPrice = (this.event?.price ?? 0) * this.totalTicket;
  }

  deCreaseTicket() {
    // Chỉ cho phép giảm khi totalTicket > 1
    if (this.totalTicket > 1) {
      this.totalTicket -= 1;
      this.totalPrice = (this.event?.price ?? 0) * this.totalTicket;
    }
  }

  isChecked() {
    this.isHidden = !this.isHidden;
  }

  

  actionSubscribe() {
    const userId = this.authService.getCurrentFirebaseUser()?.uid;
    const eventId = this.event?.id;
  
    if (!userId || !eventId) {
      this.showError('Không thể thực hiện hành động này');
      return;
    }
  
    
    if (this.isEventFull) {
      this.showError('Sự kiện đã đủ người tham dự!');
      return;
    }

    
  
    this.subscript.addSubscription(
      userId,
      eventId,
      this.showStartTime ?? '',
      this.showEndTime ?? '',
      this.totalPrice ?? 0
    ).subscribe({
      next: () => {
        this.hasSubscribes = true; 
        this.subscript.updateAttendeeCount(eventId, 1).subscribe(() => {
          
          this.subscript.checkEventFull(eventId).subscribe(isFull => {
            this.isEventFull = isFull;
          });
        });
        this.ticketsService.createTicket(
          userId, 
          eventId, 
          this.totalPrice ?? 0,
          this.showEndTime ?? '' 
        ).subscribe({
          next: (ticket) =>{
            console.log('Ticket created:', ticket);
          }
        })
        this.showNotification = true;
        this.notificationMessage = 'Đăng ký sự kiện thành công!';
        this.notificationType = 'success';
      },
      error: (error) => {
        console.error('Error subscribing to event:', error);
        this.showNotification = true;
        this.notificationMessage = 'Có lỗi xảy ra khi đăng ký sự kiện';
        this.notificationType = 'error';
      }
    });
  }
  
  actionUnsubscribe() {
    const userId = this.authService.getCurrentFirebaseUser()?.uid;
    const eventId = this.event?.id;
  
    if (!userId || !eventId) {
      this.showError('Không thể thực hiện hành động này');
      return;
    }
  
    this.subscript.unsubscribeAction(userId, eventId).subscribe({
      next: () => {
        this.hasSubscribes = false; 
        this.subscript.updateAttendeeCount(eventId, -1).subscribe();
        this.showNotification = true;
        this.notificationMessage = 'Hủy đăng ký sự kiện thành công!';
        this.notificationType = 'success';
      },
      error: (error) => {
        console.error('Error unsubscribing from event:', error);
        this.showNotification = true;
        this.notificationMessage = 'Có lỗi xảy ra khi hủy đăng ký sự kiện';
        this.notificationType = 'error';
      }
    });
  }
  isFollowLoading = false;

  actionFollow() {
    if (this.isFollowLoading) return;
  
    this.isFollowLoading = true;
  
    const currentUserId = this.authService.getCurrentFirebaseUser()?.uid;
    const organizerId = this.event?.organizer?.id;
  
    if (!currentUserId || !organizerId) {
      this.showError('Không thể thực hiện hành động này');
      this.isFollowLoading = false;
      return;
    }
  
    const action = !this.hasFollow
      ? this.subscript.addFollow(currentUserId, organizerId as string, this.event?.id)
      : this.subscript.toggleFollowStatus(currentUserId, organizerId as string);
  
    action.pipe(finalize(() => this.isFollowLoading = false)).subscribe({
      next: () => {
        this.hasFollow = !this.hasFollow; // Cập nhật trạng thái follow
        console.log(`Follow status updated: ${this.hasFollow}`);
  
        // Cập nhật số lượng followers
        this.subscript.getAllFollower(currentUserId, organizerId as string).subscribe(followerCount => {
          if (followerCount !== -1 && this.event?.organizer) {
            this.event.organizer.followers = followerCount;
            console.log('Updated follower count:', followerCount);
          }
        });
  
        this.showSuccess(
          this.hasFollow
            ? 'Đã theo dõi người tổ chức thành công'
            : 'Đã hủy theo dõi người tổ chức'
        );
      },
      error: (error) => {
        console.error('Follow action failed:', error);
        this.showError('Có lỗi xảy ra khi thực hiện hành động');
      }
    });
  }
  
  private showError(message: string) {
    this.showNotification = true;
    this.notificationMessage = message;
    this.notificationType = 'error';
    setTimeout(() => this.showNotification = false, 3000);
  }

  private showSuccess(message: string) {
    this.showNotification = true;
    this.notificationMessage = message;
    this.notificationType = 'success';
    setTimeout(() => this.showNotification = false, 3000);
  }

  openUnsubscribeDialog() {
    this.showUnsubscribeDialog = true;
  }

  
  closeUnsubscribeDialog() {
    this.showUnsubscribeDialog = false;
  }

  
  confirmUnsubscribe() {
    this.closeUnsubscribeDialog(); 
    this.actionUnsubscribe(); 
  }

  // Ticket purchase flow methods
  onTicketsSelected(tickets: SelectedTicket[]): void {
    this.selectedTickets = tickets;
  }

  onBuyNow(tickets: SelectedTicket[]): void {
    this.selectedTickets = tickets;
    this.showOrderReviewPopup = true;
  }

  onProceedToPayment(data: { buyerInfo: { fullName: string; email: string; phone: string }; couponCode?: string }): void {
    if (!this.event) return;

    // Create order
    const order = this.orderService.createOrder(
      this.event.id || '',
      this.event.name || '',
      this.selectedTickets,
      data.buyerInfo,
      data.couponCode
    );

    this.currentOrderId = order.orderId || '';
    this.showOrderReviewPopup = false;
    this.showPaymentMethodPopup = true;
  }

  onPaymentMethodSelected(method: PaymentMethod): void {
    const orderId = this.currentOrderId;
    if (orderId) {
      this.orderService.updatePaymentMethod(orderId, method);
    }

    if (method === 'vnpay' || method === 'momo') {
      this.showPaymentMethodPopup = false;
      this.showQRPaymentPopup = true;
    } else {
      // For Visa/Mastercard/PayPal, redirect to payment gateway
      // TODO: Implement payment gateway redirect
      console.log('Redirecting to payment gateway:', method);
      this.showPaymentMethodPopup = false;
      // Simulate payment result for now
      setTimeout(() => {
        this.paymentResult = 'success';
        this.paymentResultMessage = 'Thanh toán thành công qua ' + method;
        this.showPaymentResultPopup = true;
      }, 2000);
    }
  }

  onQRPaymentConfirmed(): void {
    const orderId = this.currentOrderId;
    if (orderId) {
      this.orderService.updateOrderStatus(orderId, 'paid');
    }
    this.showQRPaymentPopup = false;
    this.paymentResult = 'success';
    this.paymentResultMessage = 'Thanh toán thành công! Vé đã được gửi về email của bạn.';
    this.showPaymentResultPopup = true;
  }

  onPaymentResultClose(): void {
    this.showPaymentResultPopup = false;
    this.orderService.clearOrder();
    this.selectedTickets = [];
  }

  onPaymentResultViewTickets(): void {
    this.showPaymentResultPopup = false;
    // TODO: Navigate to user tickets page
    this.router.navigate(['/profile/tickets']);
  }

  onPaymentResultGoHome(): void {
    this.showPaymentResultPopup = false;
    this.orderService.clearOrder();
    this.selectedTickets = [];
    this.router.navigate(['/home']);
  }

  onPaymentResultRetry(): void {
    this.showPaymentResultPopup = false;
    this.showPaymentMethodPopup = true;
  }

  onOrderReviewCancel(): void {
    this.showOrderReviewPopup = false;
  }

  onPaymentMethodCancel(): void {
    this.showPaymentMethodPopup = false;
    this.showOrderReviewPopup = true;
  }

  onQRPaymentCancel(): void {
    this.showQRPaymentPopup = false;
    this.showPaymentMethodPopup = true;
  }

  
}
