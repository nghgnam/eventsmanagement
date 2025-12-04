/* eslint-disable @typescript-eslint/no-explicit-any */

import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { SafeUrlService } from '../../../../core/services/santizer.service';
import { Router, RouterModule } from '@angular/router';
import { Subscription, from } from 'rxjs';
import { EventList } from '../../../../core/models/eventstype';
import { User } from '../../../../core/models/userstype';
import { AuthService } from '../../../../core/services/auth.service';
import { EventsService } from '../../../../core/services/events.service';
import { UsersService } from '../../../../core/services/users.service';
import { CreateEventComponent } from '../create-event/create-event.component';
import { EditEventComponent } from '../edit-event/edit-event.component';
import { PopupComponent } from '../../../../shared/components/popup/popup.component';

@Component({
  selector: 'app-manage-events',
  standalone: true,
  imports: [RouterModule, CommonModule, CreateEventComponent, EditEventComponent, PopupComponent],
  templateUrl: './manage-events.component.html',
  styleUrls: ['./manage-events.component.css']
})
export class ManageEventsComponent implements OnInit, OnDestroy {
  private usersService = inject(UsersService);
  private router = inject(Router);
  private sanitizer = inject(SafeUrlService);
  private eventService = inject(EventsService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  editEventid: string | undefined;
  currentUser: User | undefined;
  currentOrganizerEvent: EventList[] = [];
  errorMessage: string = '';
  successMessage: string = '';
  showCreateEventPopup: boolean = false;
  showEditEventPopup: boolean = false;
  activeTab: 'upcoming' | 'past' | 'edit' | 'delete' | 'create' | undefined = 'upcoming';
  isLoading: boolean = false;

  trashEvents: EventList[] = []; 
  EditEvents: EventList[] = [];

  showDeleteDialog: boolean = false;
  eventToDelete: EventList | null = null;
  eventToEdit: EventList | null = null;

  private authSubscription: Subscription | null = null;
  private createSuccessTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
      this.authSubscription = null;
    }
    this.authSubscription = this.authService.onAuthStateChanged().subscribe({
      next: user => {
        if (user?.uid) {
        this.usersService.getCurrentUserById(user.uid).subscribe((userData: unknown) => {
          if (userData) {
            this.currentUser = userData as User;
            this.loadOrganizerEvents();
          } else {
            this.errorMessage = 'User data not found';
            this.router.navigate(['/home']);
          }
        });
      } else {
        this.router.navigate(['/login']);
        }
      },
      error: error => {
        console.error('Error observing auth state:', error);
        this.errorMessage = 'Unable to determine authentication state.';
      }
    });
  }

  loadOrganizerEvents(): void {
    if (this.currentUser?.id) {
      this.isLoading = true;
      from(this.eventService.getEventsByOrganizer(String(this.currentUser.id)))
        .subscribe({
          next: (events: unknown) => {
            this.currentOrganizerEvent = events as EventList[];
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error loading events:', error);
            this.errorMessage = 'Failed to load events';
            this.isLoading = false;
          }
        });
    }
  }

  openCreateEventPopup(): void {
    this.showCreateEventPopup = true;
      this.errorMessage = '';
      this.successMessage = '';
  }

  closeCreateEventPopup(): void {
    if (!this.showCreateEventPopup) {
          return;
    }
    this.showCreateEventPopup = false;
    this.successMessage = '';
    this.errorMessage = '';
    this.resetSuccessMessageTimeout();
  }

  setActiveTab(tab: 'upcoming' | 'past' | 'edit' | 'delete' | 'create' | undefined): void {
    this.activeTab = tab;
    this.closeCreateEventPopup();
  }

  sanitizeImageUrl(imageUrl: string | undefined): string | undefined {
    if (!imageUrl || imageUrl.trim() === '') {
      return undefined;
    }
    return this.sanitizer.getSafeUrl(imageUrl, true);
  }

  getComingUpEvents(event: EventList): boolean {
    const today = new Date();
    const dateTimeOptions = event.date_time_options || event.schedule?.dateTimeOptions || [];
    return dateTimeOptions.some((option: any) => {
      const start = new Date(option.start_time || option.startDate || '');
      const end = new Date(option.end_time || option.endDate || '');
      return start > today || end > today;
    });
  }

  getTotalRevenue(event: EventList): number {
    const price = event.core?.price ?? event.price ?? 0;
    const attendeesCount = event.engagement?.attendeesCount ?? event.attendees_count ?? 0;
    if (price && attendeesCount) {
      return price * attendeesCount;
    }
    return 0;
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEventStatus(event: EventList): string {
    const statusState = typeof event.status === 'string' ? event.status : event.status?.state;
    if (statusState === 'cancelled') {
      return 'Cancelled';
    }
    const today = new Date();
    const dateTimeOptions = event.date_time_options || event.schedule?.dateTimeOptions || [];
    if (dateTimeOptions.length === 0) {
      return 'Draft';
    }
    const firstOption = dateTimeOptions[0] as Record<string, unknown>;
    const startTime = firstOption['start_time'] || firstOption['startDate'] || '';
    const endTime = firstOption['end_time'] || firstOption['endDate'] || '';
    const startDate = startTime ? new Date(startTime as string) : new Date();
    const endDate = endTime ? new Date(endTime as string) : new Date();

    if (startDate > today) {
      return 'Upcoming';
    } else if (endDate < today) {
      return 'Past';
    } else {
      return 'Ongoing';
    }
  }

  editEvent(event: EventList): void {
    this.eventToEdit = event;
    this.editEventid = event.id;
    this.openEditEventPopup();
  }

  openEditEventPopup(): void {
    this.showEditEventPopup = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeEditEventPopup(): void {
    if (!this.showEditEventPopup) {
      return;
    }
    this.showEditEventPopup = false;
    this.eventToEdit = null;
    this.editEventid = undefined;
    this.successMessage = '';
    this.errorMessage = '';
    this.resetSuccessMessageTimeout();
  }

  confirmDelete(event: EventList): void {
    this.eventToDelete = event;
    this.showDeleteDialog = true;
  }

  cancelDelete(): void {
    this.showDeleteDialog = false;
    this.eventToDelete = null;
  }

  async deleteEvent(event: EventList): Promise<void> {
    if (!event.id) return;

    try {
      await (this.eventService.cancelEvent(event.id).toPromise() as Promise<unknown>);
      this.successMessage = 'Event cancelled successfully';
      this.showDeleteDialog = false;
      this.eventToDelete = null;
      this.loadOrganizerEvents();
    } catch (error) {
      console.error('Error cancelling event:', error);
      this.errorMessage = 'Failed to cancel event';
    }
  }

  async restoreEvent(event: EventList): Promise<void> {
    if (!event.id) return;

    try {
      await (this.eventService.restoreEvent(event.id).toPromise() as Promise<unknown>);
      this.successMessage = 'Event restored successfully';
      this.loadOrganizerEvents();
    } catch (error) {
      console.error('Error restoring event:', error);
      this.errorMessage = 'Failed to restore event';
    }
  }

  // Filter events based on active tab
  getFilteredEvents(): EventList[] {
    if (!this.currentOrganizerEvent.length) return [];

    const today = new Date();
    if (this.activeTab === 'upcoming') {
      return this.currentOrganizerEvent.filter(event => {
        const startDate = new Date(event.date_time_options[0].start_time);
        return startDate > today && event.status !== 'cancelled';
      });
    } else if (this.activeTab === 'past') {
      return this.currentOrganizerEvent.filter(event => {
        const endDate = new Date(event.date_time_options[0].end_time);
        return endDate < today && event.status !== 'cancelled';
      });
    } else {
      return this.currentOrganizerEvent.filter(event => event.status !== 'cancelled');
    }
  }

  handleCreateSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    this.closeCreateEventPopup();
    this.loadOrganizerEvents();
    this.scheduleSuccessMessageClear();
  }

  handleCreateError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
  }

  handleEditSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    this.closeEditEventPopup();
    this.loadOrganizerEvents();
    this.scheduleSuccessMessageClear();
  }

  handleEditError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
  }

  private scheduleSuccessMessageClear(): void {
    this.resetSuccessMessageTimeout();
    this.createSuccessTimeout = setTimeout(() => {
      this.successMessage = '';
    }, 5000);
  }

  private resetSuccessMessageTimeout(): void {
    if (this.createSuccessTimeout) {
      clearTimeout(this.createSuccessTimeout);
      this.createSuccessTimeout = null;
    }
  }

  getEventIdEdit(eventId: string | undefined){
    return this.editEventid = eventId
  }
  onEventRestored() {
    this.setActiveTab('past'); // Chuyển về tab Past Events
    this.loadOrganizerEvents(); // Cập nhật lại danh sách
  }

  goToDashboard(event: EventList): void {
    if (!event.id) return;
    this.router.navigate(['/organizer/dashboard', event.id]);
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
      this.authSubscription = null;
    }
    if (this.createSuccessTimeout) {
      clearTimeout(this.createSuccessTimeout);
      this.createSuccessTimeout = null;
    }
  }
}
