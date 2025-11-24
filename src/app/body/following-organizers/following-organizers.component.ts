import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UsersService } from '../../service/users.service';
import { AuthService } from '../../service/auth.service';
import { Subscription } from 'rxjs';
import { Follows } from '../../types/followtype';
import { User } from '../../types/userstype';
import { auth } from '../../config/firebase.config';
import { SafeUrlService } from '../../service/santizer.service';
import { SafeUrl } from '@angular/platform-browser';

interface FollowWithOrganizer extends Follows {
    organizer?: {
        id: string;
        fullName: string;
        profileImage?: string;
        organization?: {
            companyName: string;
        };
    };
}

@Component({
  selector: 'app-following-organizers',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="following-organizers">
      <div class="section-header">
        <h2>Following Organizers</h2>
        <p class="section-description">Manage your followed organizers and stay updated with their events</p>
      </div>

      <!-- Loading State -->
      @if (isLoading) {
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading organizers...</p>
        </div>
      }

      <!-- No Organizers Message -->
      @if (!isLoading && followedOrganizers.length === 0) {
        <div class="no-organizers">
          <i class="fas fa-users"></i>
          <h3>No followed organizers</h3>
          <p>Start following organizers to see their events here</p>
          <button class="btn-primary" routerLink="/body">Discover Organizers</button>
        </div>
      }

      <!-- Organizers Grid -->
      @if (!isLoading && followedOrganizers.length > 0) {
        <div class="organizers-grid">
          @for (follow of followedOrganizers; track follow.id) {
            <div class="organizer-card">
              @if (follow.organizer) {
                <div class="organizer-info">
                  <div class="organizer-avatar-container">
                    @if (getSafeImageUrl(follow.organizer.profileImage); as safeUrl) {
                      <img 
                        [src]="safeUrl" 
                        [alt]="follow.organizer.fullName" 
                        class="organizer-avatar"
                        (error)="handleImageError($event)">
                    }
                  </div>
                  <div class="organizer-details">
                    <h3>{{follow.organizer.fullName}}</h3>
                    <p class="company-name">{{follow.organizer.organization?.companyName || 'No company name'}}</p>
                    <div class="follow-info">
                      <span class="status" [class.active]="follow.status === 'active'">{{follow.status}}</span>
                      @if (follow.follow_date) {
                        <span class="follow-date">
                          Followed since: {{follow.follow_date | date:'mediumDate'}}
                        </span>
                      }
                    </div>
                  </div>
                </div>
              }
              <div class="organizer-actions">
                <button class="unfollow-btn" (click)="unfollowOrganizer(follow.id)">
                  <i class="fas fa-user-minus"></i>
                  Unfollow
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .following-organizers {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .section-header {
      margin-bottom: 30px;
      text-align: center;
      padding: 0 15px;
    }

    .section-header h2 {
      font-size: 28px;
      color: #333;
      margin-bottom: 10px;
      line-height: 1.2;
    }

    .section-description {
      color: #666;
      font-size: 16px;
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.5;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px;
    }

    .loading-spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin-bottom: 10px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .no-organizers {
      text-align: center;
      padding: 40px;
      color: #666;
      background: #f8f9fa;
      border-radius: 8px;
      margin: 20px 0;
    }

    .no-organizers i {
      font-size: 48px;
      margin-bottom: 16px;
      color: #ccc;
    }

    .no-organizers h3 {
      font-size: 24px;
      margin-bottom: 10px;
      color: #333;
    }

    .no-organizers p {
      margin-bottom: 20px;
    }

    .btn-primary {
      background: #3498db;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      transition: background 0.2s;
    }

    .btn-primary:hover {
      background: #2980b9;
    }

    .organizers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .organizer-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 15px;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .organizer-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .organizer-info {
      display: flex;
      gap: 15px;
    }

    .organizer-avatar-container {
      position: relative;
      width: 80px;
      height: 80px;
      flex-shrink: 0;
    }

    .organizer-avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .organizer-details {
      flex: 1;
      min-width: 0;
    }

    .organizer-details h3 {
      margin: 0 0 5px 0;
      font-size: 18px;
      color: #333;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .company-name {
      margin: 0 0 5px 0;
      color: #666;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .follow-info {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-top: 10px;
    }

    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      background: #e9ecef;
      color: #666;
      text-transform: capitalize;
    }

    .status.active {
      background: #28a745;
      color: white;
    }

    .follow-date {
      font-size: 12px;
      color: #666;
    }

    .organizer-actions {
      display: flex;
      justify-content: flex-end;
    }

    .unfollow-btn {
      background: #dc3545;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
      font-size: 14px;
    }

    .unfollow-btn:hover {
      background: #c82333;
    }

    .unfollow-btn i {
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .organizers-grid {
        grid-template-columns: 1fr;
      }

      .organizer-card {
        padding: 15px;
      }

      .organizer-avatar-container {
        width: 60px;
        height: 60px;
      }

      .following-organizers {
        padding: 15px;
      }

      .section-header {
        margin-bottom: 20px;
      }

      .section-header h2 {
        font-size: 24px;
      }

      .section-description {
        font-size: 14px;
        padding: 0 10px;
      }
    }

    @media (max-width: 480px) {
      .following-organizers {
        padding: 10px;
      }

      .section-header {
        margin-bottom: 15px;
      }

      .section-header h2 {
        font-size: 20px;
      }

      .section-description {
        font-size: 13px;
      }
    }
  `]
})
export class FollowingOrganizersComponent implements OnInit, OnDestroy {
  followedOrganizers: FollowWithOrganizer[] = [];
  isLoading = true;
  private subscriptions: Subscription[] = [];
  currentUser: User | null = null;
  defaultAvatar = 'assets/images/default-avatar.png';

  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private sanitizerService: SafeUrlService
  ) {}

  ngOnInit() {
    // Listen to auth state changes
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        this.usersService.getCurrentUserById(user.uid).subscribe(userData => {
          if (userData) {
            this.currentUser = userData;
            this.loadFollowedOrganizers();
          } else {
            console.warn('No user data found');
            this.isLoading = false;
          }
        });
      } else {
        console.warn('No authenticated user found');
        this.isLoading = false;
      }
    });

    this.subscriptions.push(new Subscription(() => unsubscribe()));
  }

  getSafeImageUrl(url: string | undefined): SafeUrl | undefined {
    return this.sanitizerService.sanitizeImageUrl(url);
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = this.defaultAvatar;
  }

  private loadFollowedOrganizers() {
    if (!this.currentUser?.id) {
      console.warn('No current user found');
      this.isLoading = false;
      return;
    }

    console.log('Loading follows for user:', this.currentUser.id);
    this.isLoading = true;
    
    const sub = this.usersService.getFollowedOrganizers(this.currentUser.id).subscribe({
      next: (follows) => {
        console.log('Received follows:', follows);
        if (!follows || follows.length === 0) {
          console.log('No follows found');
        } else {
          console.log('Processing follows:', follows.length);
          this.followedOrganizers = follows.filter(follow => {
            if (!follow.organizer) {
              console.warn('Follow missing organizer data:', follow.id);
              return false;
            }
            return true;
          });
          console.log('Filtered follows:', this.followedOrganizers.length);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading follows:', error);
        this.isLoading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  unfollowOrganizer(followId: string | undefined) {
    if (!followId) {
      console.warn('Cannot unfollow: no follow ID provided');
      return;
    }

    this.isLoading = true;
    const sub = this.usersService.unfollowOrganizer(followId).subscribe({
      next: () => {
        console.log('Successfully unfollowed:', followId);
        this.followedOrganizers = this.followedOrganizers.filter(f => f.id !== followId);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error unfollowing organizer:', error);
        this.isLoading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
} 