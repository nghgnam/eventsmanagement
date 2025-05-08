import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventList } from '../../types/eventstype';
import { EventsService } from '../../service/events.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-trash-events',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trash-events.component.html',
  styleUrls: ['./trash-events.component.css']
})
export class TrashEventsComponent implements OnInit {
  cancelledEvents: EventList[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  @Output() restored = new EventEmitter<void>();


  constructor(
    private eventsService: EventsService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadCancelledEvents();
  }

  loadCancelledEvents() {
    this.isLoading = true;
    this.eventsService.getEventsByStatus('cancelled').subscribe({
      next: (events) => {
        this.cancelledEvents = events;
        this.isLoading = false;
      },
      error: (error) => {
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
      error: (error) => {
        console.error('Error restoring event:', error);
        this.errorMessage = 'Failed to restore event';
      }
    });
  }

  getSafeUrl(url: string | undefined): SafeUrl | undefined {
    if (!url) return undefined;
    return this.sanitizer.bypassSecurityTrustUrl(url);
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
