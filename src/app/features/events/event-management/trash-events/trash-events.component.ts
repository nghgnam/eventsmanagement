import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventList } from '../../../../core/models/eventstype';
import { EventsService } from '../../../../core/services/events.service';
import { SafeUrlService } from '../../../../core/services/santizer.service';

@Component({
  selector: 'app-trash-events',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trash-events.component.html',
  styleUrls: ['./trash-events.component.css']
})
export class TrashEventsComponent implements OnInit {
  private eventsService = inject(EventsService);
  private sanitizer = inject(SafeUrlService);

  cancelledEvents: EventList[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  @Output() restored = new EventEmitter<void>();


  ngOnInit() {
    this.loadCancelledEvents();
  }

  loadCancelledEvents() {
    this.isLoading = true;
    this.eventsService.getEventsByStatus('cancelled').subscribe({
      next: (events: EventList[]) => {
        this.cancelledEvents = events;
        this.isLoading = false;
      },
      error: (error: unknown) => {
        console.error('Error loading cancelled events:', error);
        this.errorMessage = 'Failed to load cancelled events';
        this.isLoading = false;
      }
    });
  }

  restoreEvent(event: EventList) {
    if (!event.id) return;
    
    this.eventsService.restoreEvent(event.id).subscribe({
      next: () => {
        this.loadCancelledEvents(); // Reload the list after restoring
        this.restored.emit();
      },
      error: (error: unknown) => {
        console.error('Error restoring event:', error);
        this.errorMessage = 'Failed to restore event';
      }
    });
  }

  getSafeUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    return this.sanitizer.getSafeUrl(url, false);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
