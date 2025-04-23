import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EventsService } from '../../service/events.service';
import { EventList } from '../../types/eventstype';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import { SafeUrlService } from '../../service/santizer.service';
import { SafeUrl } from '@angular/platform-browser';
import { SubscriptionService } from '../../service/subscription.service';
import { getAuth } from 'firebase/auth';

@Component({
  selector: 'app-detail-event',
  standalone: true,
  imports: [CommonModule],
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
  auth = getAuth();
  
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
    
    const routeSub = this.route.paramMap.subscribe(params => {
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
                },
                error: (error) => {
                  console.error('Error checking subscription:', error);
                  this.hasSubscribes = false;
                }
              });
              this.subscriptions.push(currentSubSub);
            }

            if (organizerId) {
              this.subscript.getUserAndOrganizer(userId, organizerId);
              const followSub = this.subscript.follows$.subscribe({
                next: (follows) => {
                  if (follows && follows.length > 0) {
                    this.hasFollow = follows.some(f => f.status === 'active');
                  } else {
                    this.hasFollow = false;
                  }
                },
                error: (error) => {
                  console.error('Error checking follow status:', error);
                  this.hasFollow = false;
                }
              });
              this.subscriptions.push(followSub);
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
    } else {
      this.totalTicket = 1;
      this.totalPrice = this.event?.price ?? 0;
    }
  }
  
  isChecked() {
    this.isHidden = !this.isHidden;
  }

  actionSubscribe() {
    const userId = this.auth.currentUser?.uid;
    const eventId = this.event?.id;

    if (userId && eventId) {
      this.subscript.addSubscibeAction(userId, eventId).subscribe({
        next: () => {
          this.hasSubscribes = true;
          console.log('Successfully subscribed to event');
        },
        error: (error) => {
          console.error('Error subscribing to event:', error);
          this.hasSubscribes = false;
        }
      });
    }
  }

  actionFollow() {
    const userId = this.auth.currentUser?.uid;
    const organizerId = this.event?.organizer?.id;
  
    if (userId && organizerId) {
      this.hasFollow = !this.hasFollow;
      
      this.subscript.addFollowAction(userId, organizerId).subscribe({
        next: () => {
          this.subscript.getUserAndOrganizer(userId, organizerId);
        },
        error: (error) => {
          console.error('Error following organizer:', error);
          this.hasFollow = !this.hasFollow;
        }
      });
    }
  }
}
