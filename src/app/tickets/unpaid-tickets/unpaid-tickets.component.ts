import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeUrl } from '@angular/platform-browser';
import { SafeUrlService } from '../../service/santizer.service';
@Component({
  selector: 'app-unpaid-tickets',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './unpaid-tickets.component.html',
  styleUrls: ['./unpaid-tickets.component.css']
})
export class UnpaidTicketsComponent implements OnInit, OnDestroy {
  @Input() dataEvent: any;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading = false;

  constructor(private sanitizer: SafeUrlService) { }
  ngOnInit(): void {
  }

  getSafeUrl(url: string | undefined): SafeUrl| undefined{
      
      return this.sanitizer.sanitizeImageUrl(url);
  
  }
  ngOnDestroy(): void {
    
  }
}
