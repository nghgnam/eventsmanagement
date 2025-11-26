import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EventsService } from '../../../core/services/events.service';
import { EventList, TimestampLike } from '../../../core/models/eventstype';
import { CommonModule } from '@angular/common';
import { forkJoin, Observable, Subject, Subscription } from 'rxjs';
import { SafeUrlService } from '../../../core/services/santizer.service';
import { SafeUrl } from '@angular/platform-browser';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { getAuth } from 'firebase/auth';
import { finalize, takeUntil } from 'rxjs/operators';
import { TicketService } from '../../../core/services/ticket.service';
import { Timestamp } from 'firebase/firestore';
type ScheduleOption = Record<string, TimestampLike | string | number | null | undefined>;

@Component({
  selector: 'app-detail-event',
  standalone: true,
  imports: [CommonModule],
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
  userId: string = '';
  organizerId: string = '';
  isEventFull: boolean = false;
  auth = getAuth();
  private destroy$ = new Subject<void>();
  showUnsubscribeDialog: boolean = false;

  // Notification state
  showNotification: boolean = false;
  notificationMessage: string = '';
  notificationType: 'success' | 'error' = 'success';

  private subscriptions: Subscription[] = [];

  constructor() {
    this.events$ = this.eventsService.events$;
  }


  ngOnInit() {

    const routeSub = this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const eventId = params.get('id');
      const userId = this.auth.currentUser?.uid;

      if (eventId && userId) {
        const eventSub = this.eventsService.getEventById(eventId).subscribe({
          next: (event) => {
            this.event = event;
            const organizerIdValue = event?.organizer?.id;
            const organizerId = organizerIdValue !== undefined && organizerIdValue !== null ? String(organizerIdValue) : undefined;
            this.organizerId = organizerId ?? '';

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
              this.setDefaultSchedule(this.event);
            }
            this.totalPrice = (this.event?.core?.price ?? 0) * this.totalTicket;

            
            if (organizerId && userId) {
              this.subscript.checkFollowStatus(userId, organizerId).subscribe(isFollowing => {
                this.hasFollow = isFollowing;
                console.log('Follow status:', isFollowing);
              });

              
              forkJoin({
                subscriberCount: this.subscript.getSubscriberCount(eventId),
                followerCount: this.subscript.getAllFollower(userId, organizerId)
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
    });
    this.subscriptions.push(routeSub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getSafeUrl(url: string | undefined): SafeUrl | undefined {
    return this.sanitizer.sanitizeImageUrl(url);
  }

  getDatetimeClick(index: number) {
    this.isClickActive = index;
    this.activeBorder = index;
    const option = this.getScheduleOption(this.event, index);
    this.showStartTime = this.extractDateString(option ? option['start_time'] ?? option['startTime'] : undefined);
    this.showEndTime = this.extractDateString(option ? option['end_time'] ?? option['endTime'] : undefined);
  }

  goToDetail(eventId: string | undefined) {
    if (eventId) {
      this.router.navigate(['/detail', eventId]);
    }
  }

  inCreaseTicket() {
    this.totalTicket += 1;
    this.totalPrice = (this.event?.core?.price ?? 0) * this.totalTicket;
  }

  deCreaseTicket() {
    if(this.event?.core?.price === 0 ){
      this.showError('Sự kiện miễn phí chỉ cho phép đăng ký 1 vé!')
      return ;
    }
    if (this.totalTicket > 1) {
      this.totalTicket -= 1;
      this.totalPrice = (this.event?.core?.price ?? 0) * this.totalTicket;
    }
  }

  isChecked() {
    this.isHidden = !this.isHidden;
  }

  

  actionSubscribe() {
    const userId = this.auth.currentUser?.uid;
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
        this.ticketsService.createTicket(userId, eventId, this.totalPrice ?? 0,this.showEndTime ?? '' 
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
    const userId = this.auth.currentUser?.uid;
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
  
    const currentUserId = this.auth.currentUser?.uid;
    const organizerIdValue = this.event?.organizer?.id;
    const organizerId = organizerIdValue !== undefined && organizerIdValue !== null ? String(organizerIdValue) : undefined;
  
    if (!currentUserId || !organizerId) {
      this.showError('Không thể thực hiện hành động này');
      this.isFollowLoading = false;
      return;
    }
  
    const action = !this.hasFollow
      ? this.subscript.addFollow(currentUserId, organizerId, this.event?.id)
      : this.subscript.toggleFollowStatus(currentUserId, organizerId);
  
    action.pipe(finalize(() => this.isFollowLoading = false)).subscribe({
      next: () => {
        this.hasFollow = !this.hasFollow; // Cập nhật trạng thái follow
        console.log(`Follow status updated: ${this.hasFollow}`);
  
        // Cập nhật số lượng followers
        this.subscript.getAllFollower(currentUserId, organizerId).subscribe(followerCount => {
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

  getEventImage(event: EventList | undefined | null): string {
    return (
      event?.media?.primaryImage ||
      event?.media?.coverImage ||
      'assets/images/default-event.jpg'
    );
  }

  getEventType(event: EventList | undefined | null): string | null {
    return event?.core?.eventType ?? event?.location?.type ?? null;
  }

  getEventTags(event: EventList | undefined | null): string[] {
    return event?.core?.tags ?? [];
  }

  getEventStartDate(event: EventList | undefined | null): Date | null {
    const primaryOption = this.getScheduleOption(event, 0);
    const value = primaryOption ? primaryOption['start_time'] ?? primaryOption['startTime'] : event?.schedule?.startDate;
    return this.toDate(value as TimestampLike | string | undefined);
  }

  getEventEndDate(event: EventList | undefined | null): Date | null {
    const primaryOption = this.getScheduleOption(event, 0);
    const value = primaryOption ? primaryOption['end_time'] ?? primaryOption['endTime'] : event?.schedule?.endDate;
    return this.toDate(value as TimestampLike | string | undefined);
  }

  getEventDescription(event: EventList | undefined | null): string {
    return event?.core?.description || '';
  }

  getEventContent(event: EventList | undefined | null): string {
    return event?.core?.content || '';
  }

  getScheduleOptions(event: EventList | undefined | null): ScheduleOption[] {
    return (event?.schedule?.dateTimeOptions as ScheduleOption[]) ?? [];
  }

  getScheduleOption(event: EventList | undefined | null, index: number): ScheduleOption | undefined {
    return this.getScheduleOptions(event)[index];
  }

  getOptionDate(option: ScheduleOption | undefined, type: 'start' | 'end'): Date | null {
    if (!option) return null;
    const key = type === 'start' ? (option['start_time'] ?? option['startTime']) : (option['end_time'] ?? option['endTime']);
    return this.toDate(key as TimestampLike | string | undefined);
  }

  getEventPrice(event: EventList | undefined | null): number | null {
    return event?.core?.price ?? null;
  }

  getPriceLabel(event: EventList | undefined | null): string {
    const price = this.getEventPrice(event);
    if (!price) {
      return 'Free';
    }
    const currency = (event?.metadata?.['currency'] as string) ?? 'VND';
    return `${price.toLocaleString()} ${currency}`;
  }

  getOrganizerImage(event: EventList | undefined | null): SafeUrl | string {
    const source = event?.organizer?.profileImage || event?.organizer?.logo || undefined;
    return this.getSafeUrl(source) || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1744575077/default-avatar_br3ffh.png';
  }

  getSaleEndDate(): Date | null {
    if (this.showEndTime) {
      const parsed = new Date(this.showEndTime);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return this.getEventEndDate(this.event);
  }

  isFreeEvent(): boolean {
    return (this.event?.core?.price ?? 0) === 0;
  }

  private setDefaultSchedule(event: EventList | undefined | null) {
    const firstOption = this.getScheduleOption(event, 0);
    this.showStartTime = this.extractDateString(firstOption ? firstOption['start_time'] ?? firstOption['startTime'] : event?.schedule?.startDate);
    this.showEndTime = this.extractDateString(firstOption ? firstOption['end_time'] ?? firstOption['endTime'] : event?.schedule?.endDate);
  }

  private extractDateString(value: TimestampLike | string | number | null | undefined): string | undefined {
    const date = this.toDate(value);
    return date ? date.toISOString() : undefined;
  }

  private toDate(value: TimestampLike | string | number | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    if (value?.toDate instanceof Function) {
      return value.toDate();
    }
    if (typeof value === 'object' && typeof value._seconds === 'number') {
      const seconds = value._seconds;
      const nanos = value._nanoseconds ?? 0;
      return new Date(seconds * 1000 + nanos / 1e6);
    }
    return null;
  }
}
