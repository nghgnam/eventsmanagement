import { Component, OnInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EventsService } from '../../service/events.service';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { EventList } from '../../types/eventstype';

@Component({
  selector: 'app-header-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './header-search.component.html',
  styleUrls: ['./header-search.component.css']
})
export class HeaderSearchComponent implements OnInit {
  @ViewChild('searchContainer') searchContainer!: ElementRef;
  
  searchForm: FormGroup;
  searchResults: EventList[] = [];
  isLoading = false;
  showResults = false;

  constructor(
    private fb: FormBuilder,
    private eventsService: EventsService,
    private router: Router
  ) {
    this.searchForm = this.fb.group({
      searchQuery: ['']
    });
  }

  ngOnInit() {
    this.searchForm.get('searchQuery')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
          if (!query || query.length < 2) {
            this.showResults = false;
            this.searchResults = [];
            return of([]);
          }
          
          this.isLoading = true;
          this.showResults = true;
          
          return this.eventsService.searchEvents(query).pipe(
            catchError(error => {
              console.error('Search error:', error);
              return of([]);
            })
          );
        })
      )
      .subscribe(results => {
        this.searchResults = results;
        this.isLoading = false;
      });
  }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!this.searchContainer.nativeElement.contains(target)) {
      this.showResults = false;
    }
  }

  onFocus() {
    const query = this.searchForm.get('searchQuery')?.value;
    if (query && query.length >= 2) {
      this.showResults = true;
    }
  }

  onBlur(event: FocusEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (!relatedTarget || !this.searchContainer.nativeElement.contains(relatedTarget)) {
      setTimeout(() => {
        this.showResults = false;
      }, 200);
    }
  }

  onSubmit() {
    const query = this.searchForm.get('searchQuery')?.value;
    if (query) {
      this.router.navigate(['/search-results'], { 
        queryParams: { q: query }
      });
      this.showResults = false;
    }
  }

  onResultClick(event: EventList) {
    if (event.id) {
      this.router.navigate(['/detail', event.id]);
      this.showResults = false;
    }
  }
}
