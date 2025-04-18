import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EventsService } from '../../service/events.service';
import { EventList } from '../../types/eventstype';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { SafeUrlService } from '../../service/santizer.service';
import { SafeUrl } from '@angular/platform-browser';
@Component({
  selector: 'app-detail-event',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detail-event.component.html',
  styleUrls: ['./detail-event.component.css']
})
export class DetailEventComponent implements OnInit {
  event: EventList | undefined | null = null;
  events$: Observable<EventList[]> | undefined;
  showStartTime: string | undefined;
  showEndTime: string | undefined;
  isClickActive: number | null = null;
  activeBorder: number | null = null;
  totalTicket =1 ;
  isHidden: boolean = true;
  totalPrice :number | null = null;
  
  

  constructor(private route: ActivatedRoute, private eventsService: EventsService , private router: Router, private sanitizer: SafeUrlService) {
    this.events$ = this.eventsService.events$;
  }
  ngOnInit() {
    this.eventsService.fetchEvents();
    this.eventsService.events$.subscribe(events => {
      
    });
    
    const eventId = this.route.snapshot.paramMap.get('id');
    console.log(eventId)
    if (eventId) {
      this.eventsService.getEventById(eventId).subscribe(event => {
        this.event = event;
        
        if (this.showStartTime == null && this.showEndTime == null) {
          this.showStartTime = this.event?.date_time_options[0].start_time;
          this.showEndTime = this.event?.date_time_options[0].end_time;
          this.totalPrice = (this.event?.price ?? 0) * 1;
        }
      });
    }
  }
  
  getSafeUrl(url: string | undefined): SafeUrl| undefined{
    
    return this.sanitizer.sanitizeImageUrl(url);

  }

  getDatetimeClick(index: number) {
    this.isClickActive = index;
    this.activeBorder = index;
    this.showStartTime = this.event?.date_time_options[index].start_time ;
    this.showEndTime =  this.event?.date_time_options[index].end_time;
  }

  goToDetail(eventId: string | undefined) {
    this.router.navigate(['/detail', eventId]);  
    console.log(eventId)
    console.log(this.events$)
  }
  inCreaseTicket(){
    this.totalTicket += 1;
    this.totalPrice = (this.event?.price ?? 0) * this.totalTicket;

  }
  deCreaseTicket(){

    if((this.totalPrice?? 0) > 1){
      this.totalTicket -= 1;
      this.totalPrice = (this.event?.price ?? 0) *  this.totalTicket;
    }else{
      this.totalTicket = 1;
    }    
  }
  
  isChecked() {
    this.isHidden = !this.isHidden;
  }
  
}
