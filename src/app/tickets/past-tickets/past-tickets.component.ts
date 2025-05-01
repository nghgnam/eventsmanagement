import { Component, Input , OnInit, OnDestroy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeUrlService } from '../../service/santizer.service';
import { SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-past-tickets',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './past-tickets.component.html',
  styleUrls: ['../unpaid-tickets/unpaid-tickets.component.css'],
})
export class PastTicketsComponent implements OnInit, OnDestroy {
  @Input() dataEvent: any;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading = false;

  constructor(private sanitizer: SafeUrlService) { }
  ngOnInit(): void {
    // Initialize any necessary data or perform actions when the component is created
    console.log(this.dataEvent);
  }

  getSafeUrl(url: string | undefined): SafeUrl| undefined{
      
      return this.sanitizer.sanitizeImageUrl(url);
  
  }
  checkUnpaidTicket(ticket: any): boolean {
    
    return true
  }
  ngOnDestroy(): void {
    // Clean up any subscriptions or resources when the component is destroyed
  }  
}
