import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container" [class.show]="isVisible">
      <div class="notification" [class.success]="type === 'success'" [class.error]="type === 'error'">
        <div class="notification-content">
          <div class="notification-icon">
            @if (type === 'success') {
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
            }
            @if (type === 'error') {
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
              </svg>
            }
          </div>
          <div class="notification-text">
            <div class="notification-title">{{ type === 'success' ? 'Thành công' : 'Lỗi' }}</div>
            <div class="notification-message">{{ message }}</div>
          </div>
          <button class="notification-close" (click)="closeNotification()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
            </svg>
          </button>
        </div>
        <div class="notification-progress" [class.success]="type === 'success'" [class.error]="type === 'error'"></div>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      transform: translateX(120%);
      transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

    .notification-container.show {
      transform: translateX(0);
    }

    .notification {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 320px;
      max-width: 400px;
      overflow: hidden;
      position: relative;
    }

    .notification-content {
      display: flex;
      align-items: center;
      padding: 16px;
      gap: 12px;
    }

    .notification-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .notification-icon svg {
      width: 20px;
      height: 20px;
    }

    .notification-text {
      flex-grow: 1;
    }

    .notification-title {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .notification-message {
      font-size: 13px;
      color: #666;
      line-height: 1.4;
    }

    .notification-close {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: #999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    }

    .notification-close:hover {
      color: #666;
    }

    .notification-close svg {
      width: 16px;
      height: 16px;
    }

    .notification-progress {
      height: 4px;
      width: 100%;
      position: absolute;
      bottom: 0;
      left: 0;
      transform-origin: left;
      animation: progress 3s linear forwards;
    }

    .notification.success {
      border-left: 4px solid #4CAF50;
    }

    .notification.success .notification-icon {
      background-color: rgba(76, 175, 80, 0.1);
      color: #4CAF50;
    }

    .notification.success .notification-title {
      color: #4CAF50;
    }

    .notification.success .notification-progress {
      background-color: #4CAF50;
    }

    .notification.error {
      border-left: 4px solid #f44336;
    }

    .notification.error .notification-icon {
      background-color: rgba(244, 67, 54, 0.1);
      color: #f44336;
    }

    .notification.error .notification-title {
      color: #f44336;
    }

    .notification.error .notification-progress {
      background-color: #f44336;
    }

    @keyframes progress {
      0% {
        transform: scaleX(1);
      }
      100% {
        transform: scaleX(0);
      }
    }

    @media (max-width: 480px) {
      .notification {
        min-width: calc(100vw - 40px);
        margin: 0 20px;
      }
    }
  `]
})
export class NotificationComponent implements OnInit, OnDestroy {
  @Input() message: string = '';
  @Input() type: 'success' | 'error' = 'success';
  @Input() isVisible: boolean = false;
  private timeoutId: ReturnType<typeof setTimeout> | undefined;

  ngOnInit() {
    if (this.isVisible) {
      this.startTimeout();
    }
  }

  ngOnDestroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  closeNotification() {
    this.isVisible = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  private startTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      this.isVisible = false;
    }, 3000);
  }
} 