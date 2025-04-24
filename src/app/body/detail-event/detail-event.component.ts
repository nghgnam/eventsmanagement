import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EventsService } from '../../service/events.service';
import { EventList } from '../../types/eventstype';
import { CommonModule } from '@angular/common';
import { Observable, Subject, Subscription } from 'rxjs';
import { SafeUrlService } from '../../service/santizer.service';
import { SafeUrl } from '@angular/platform-browser';
import { SubscriptionService } from '../../service/subscription.service';
import { getAuth } from 'firebase/auth';
import { NotificationComponent } from '../../shared/components/notification/notification.component';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-detail-event',
  standalone: true,
  imports: [CommonModule, NotificationComponent],
  templateUrl: './detail-event.component.html',
  styleUrls: ['./detail-event.component.css']
})
export class DetailEventComponent implements OnInit, OnDestroy {
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
  isOrangizer: boolean = false;
  userId: string = ''; 
  organizerId: string = '';
  auth = getAuth();
  private destroy$ = new Subject<void>();
  
  // Notification state
  showNotification: boolean = false;
  notificationMessage: string = '';
  notificationType: 'success' | 'error' = 'success';
  
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute, 
    private eventsService: EventsService, 
    private router: Router, 
    private sanitizer: SafeUrlService,
    private subscript: SubscriptionService
  ) {
    this.events$ = this.eventsService.events$;
  }

  ngOnInit() {
    this.eventsService.fetchEvents();
    
    const routeSub = this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const eventId = params.get('id');
      const userId = this.auth.currentUser?.uid;
      
      if (eventId && userId) {
        const eventSub = this.eventsService.getEventById(eventId).subscribe({
          next: (event) => {
            this.event = event;
            const organizerId = event?.organizer?.id;
            
            if (this.showStartTime == null && this.showEndTime == null) {
              this.showStartTime = this.event?.date_time_options[0]?.start_time;
              this.showEndTime = this.event?.date_time_options[0]?.end_time;
              this.totalPrice = (this.event?.price ?? 0) * 1;
            }

            if (organizerId?.trim() === userId.trim()) {
              this.hasSubscribes = true;
              this.hasFollow = true;
              this.isOrangizer = true;
            } else {
              this.subscript.getEventAndUserHasSubs(userId, eventId);
              const currentSubSub = this.subscript.getCurrentSub$.subscribe({
                next: (sub) => {
                  this.hasSubscribes = sub && sub.length > 0;
                  console.log('Subscription status:', this.hasSubscribes);
                },
                error: (error) => {
                  console.error('Error checking subscription:', error);
                  this.hasSubscribes = false;
                }
              });
              this.subscriptions.push(currentSubSub);
            }

            if (organizerId) {
              setTimeout(() => {
                this.subscript.getUserAndOrganizer(userId, organizerId);
                const followSub = this.subscript.follows$.subscribe({
                  next: (follows) => {
                    if (Array.isArray(follows)) {
                      follows.forEach(f => {

                      });
                      this.hasFollow = follows.some(f => f.status?.trim().toLowerCase() === 'active');
                    } else {
                      console.error('Follows is not an array or is empty:', follows);
                      this.hasFollow = false;
                    }
                  },
                error: (error) => {
                  console.error('Error checking follow status:', error);
                  this.hasFollow = false;
                }
              });
              this.subscriptions.push(followSub);
              }, 500);
              
            }
          },
          error: (error) => {
            console.error('Error fetching event:', error);
            this.router.navigate(['/home']);
          }
        });
        this.subscriptions.push(eventSub);
      }
    });
    this.subscriptions.push(routeSub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.destroy$.next();
    this.destroy$.complete();
  }

  getSafeUrl(url: string | undefined): SafeUrl | undefined {
    return this.sanitizer.sanitizeImageUrl(url);
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

  inCreaseTicket() {
    this.totalTicket += 1;
    this.totalPrice = (this.event?.price ?? 0) * this.totalTicket;
  }

  deCreaseTicket() {
    if (this.totalTicket > 1) {
      this.totalTicket -= 1;
      this.totalPrice = (this.event?.price ?? 0) * this.totalTicket;
    }
  }
  
  isChecked() {
    this.isHidden = !this.isHidden;
  }

  actionSubscribe() {
    const userId = this.auth.currentUser?.uid;
    const eventId = this.event?.id;

    if (userId && eventId) {
      this.subscript.addSubscibeAction(userId, eventId, this.showStartTime, this.showEndTime, this.totalPrice).subscribe({
        next: () => {
          this.hasSubscribes = true;
          this.showNotification = true;
          this.notificationMessage = 'Đăng ký sự kiện thành công!';
          this.notificationType = 'success';
        },
        error: (error) => {
          console.error('Error subscribing to event:', error);
          this.hasSubscribes = false;
          this.showNotification = true;
          this.notificationMessage = 'Có lỗi xảy ra khi đăng ký sự kiện';
          this.notificationType = 'error';
        }
      });
    }
  }

  actionUnsubscribe() {
    const userId = this.auth.currentUser?.uid;
    const eventId = this.event?.id;

    if (userId && eventId) {
      this.subscript.unsubscribeAction(userId, eventId).subscribe({
        next: () => {
          this.hasSubscribes = false;
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
  }

  actionFollow() {
    if (!this.event?.organizer?.id) {
      this.showNotification = true;
      this.notificationMessage = 'Không thể thực hiện hành động này';
      this.notificationType = 'error';
      setTimeout(() => {
        this.showNotification = false;
      }, 3000);
      return;
    }
  
    const currentUserId = this.auth.currentUser?.uid;
    if (!currentUserId) {
      this.showNotification = true;
      this.notificationMessage = 'Vui lòng đăng nhập để thực hiện hành động này';
      this.notificationType = 'error';
      setTimeout(() => {
        this.showNotification = false;
      }, 3000);
      return;
    }
  
    if (!this.hasFollow) {
      this.subscript.addFollowAction(currentUserId, this.event.organizer.id, this.event?.id).subscribe({
        next: () => {
          this.hasFollow = true;
          if (this.event?.organizer) {
            this.event.organizer.followers++;
          }
          this.showNotification = true;
          this.notificationMessage = 'Đã theo dõi người tổ chức thành công';
          this.notificationType = 'success';
          setTimeout(() => {
            this.showNotification = false;
          }, 3000);
        },
        error: (error: Error) => {
          console.error('Error following user:', error);
          this.showNotification = true;
          this.notificationMessage = 'Có lỗi xảy ra khi theo dõi';
          this.notificationType = 'error';
          setTimeout(() => {
            this.showNotification = false;
          }, 3000);
        }
      });
    } else {
      this.subscript.addFollowAction(currentUserId, this.event.organizer.id, this.event?.id).subscribe({
        next: () => {
          this.hasFollow = false;
          if (this.event?.organizer) {
            this.event.organizer.followers--;
          }
          this.showNotification = true;
          this.notificationMessage = 'Đã hủy theo dõi người tổ chức';
          this.notificationType = 'success';
          setTimeout(() => {
            this.showNotification = false;
          }, 3000);
        },
        error: (error: Error) => {
          console.error('Error unfollowing user:', error);
          this.showNotification = true;
          this.notificationMessage = 'Có lỗi xảy ra khi hủy theo dõi';
          this.notificationType = 'error';
          setTimeout(() => {
            this.showNotification = false;
          }, 3000);
        }
      });
    }
  }
}
