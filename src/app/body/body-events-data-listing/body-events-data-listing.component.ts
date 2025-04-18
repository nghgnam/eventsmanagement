import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { EventsService } from '../../service/events.service';
import { NgFor, NgIf, CommonModule } from '@angular/common';
import { EventList } from '../../types/eventstype';
import { map, Observable, Subscription } from 'rxjs';
import { Router } from '@angular/router'; 
import { RouterModule } from '@angular/router';
import { SafeUrlService } from '../../service/santizer.service';
import { SafeUrl } from '@angular/platform-browser';
@Component({
  selector: 'app-body-events-data-listing',
  standalone: true,
  imports: [NgFor, NgIf, CommonModule, RouterModule],
  templateUrl: './body-events-data-listing.component.html',
  styleUrls: ['./body-events-data-listing.component.css']
})
export class BodyEventsDataListingComponent implements OnInit, OnDestroy , OnChanges{ 
  @Input() selectedFilter: string = '';
  @Input() location: string = '';
  
  events$: Observable<EventList[]>;
  showAll: boolean = false;
  private filteredEvents: EventList[] = [];
  displayedEvents: EventList[] = [];
  isLoading = true;
  private subscription: Subscription = new Subscription();

  constructor(private eventsService: EventsService, private router: Router, private sanitizer: SafeUrlService) {
    this.events$ = this.eventsService.events$;
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedFilter'] || changes['location']) {
      this.events$.subscribe(events => {
        this.filteredEvents = this.getFilteredEvents(events);
        this.displayedEvents = this.showAll ? this.filteredEvents : this.filteredEvents.slice(0, 8);
      });
    }
  }
  
  

  ngOnInit() {
    this.eventsService.fetchEvents(); 
    const sub = this.events$.subscribe(events=> {
      this.isLoading = false
      this.filteredEvents = this.getFilteredEvents(events);
      this.displayedEvents = this.showAll ? this.filteredEvents : this.filteredEvents.slice(0, 8)
    })
    this.subscription.add(sub)
  }

  getSafeUrl(url: string | undefined): SafeUrl| undefined{
    
    return this.sanitizer.sanitizeImageUrl(url);

  }


  getFilteredEvents(events: EventList[]): EventList[] {
    this.filteredEvents =  events.filter(event => {
      const matchLocation = !this.location || event.location.address?.toLowerCase().includes(this.location.toLowerCase());
      const filter = this.selectedFilter.toLowerCase();
      const matchFilter = this.matchFilter(event , filter);
      
      
      return matchLocation && matchFilter;    
    });
    return this.filteredEvents
  }

  private matchFilter(event: EventList, filter: string): boolean {
    switch (filter.toLowerCase()) {
      case 'all':
        return true;
      case 'draft':
        return event.status === 'draft';
      case 'published':
        return event.status === 'published';
      case 'completed':
        return event.status === 'completed';
      case 'cancelled':
        return event.status === 'cancelled';
      default:
        return (event.event_type ).toLowerCase() === filter.toLowerCase();
    }
  }

  getLimitedEvents(): EventList[] {
    return this.displayedEvents
  }

  get showSeeMore(): Observable<boolean> {
    return this.events$.pipe(
      map(events => this.getFilteredEvents(events).length > 8 && !this.showAll)
    );
  }


  showMore() {
    this.showAll = true;
  }

  goToDetail(eventId: string | undefined) {
    if (eventId) {
      this.router.navigate(['/detail', eventId]);
      console.log('Navigating to event detail:', eventId); 
    } else {
      console.error("Event ID is undefined!");
    }
  }
  ngOnDestroy(): void {
    this.subscription.unsubscribe()
  }
}
