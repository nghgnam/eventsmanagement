import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { auth } from '../../config/firebase.config';
import { EventList } from '../../types/eventstype';
import { SafeUrlService } from '../../service/santizer.service';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CloudinaryService } from '../../service/cloudinary.service';
import * as countries from 'i18n-iso-countries';
import { EventsService } from '../../service/events.service';
import en from 'i18n-iso-countries/langs/en.json';
import { UsersService } from '../../service/users.service';
import { Observable  } from 'rxjs';
import { tap  } from 'rxjs/operators';
import { Timestamp } from 'firebase/firestore';
@Component({
  selector: 'app-edit-event',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-event.component.html',
  styleUrls: ['./edit-event.component.css']
})
export class EditEventComponent implements OnInit, OnDestroy{
  @Input() eventId: string | undefined;
  @Input() countries: { code: string, name: string}[] = []
  @Input() citiesValue: any[] =[];
  @Input() districtsValue: any[] = [];
  @Input() wardsValue:any[]  = [];
  @Input() eventForm!: FormGroup;

  successMessage: string = '';
  errorMessage: string = '';
  EventList: EventList | undefined;

  private currentUserId: string | undefined;
  
  private geocodingCache: Map<string, { lat: number, lon: number }> = new Map();
  private lastGeocodingRequest: number = 0;
  private readonly GEOCODING_DELAY = 1000;

  districtsWithCities:any[] = [];
  wardsWithDistricts:any[] = [];

  constructor(
    private eventsService: EventsService,
    private sanitizer: SafeUrlService,
    private fb: FormBuilder,
    private cloudinary: CloudinaryService,
    private usersService: UsersService
  ){
    countries.registerLocale(en);
  }

  ngOnInit(): void {
    this.currentUserId = auth.currentUser?.uid

    this.usersService.getCurrentUserById(String(this.currentUserId)).pipe(
      tap(data =>{
        if(data?.type !== 'organizer'){
          this.errorMessage = 'This is not Organizer'
        }
        else{
          this.successMessage = 'Welcome Organizer' + data.fullName;
        }
      })
      
    ).subscribe({
      next: (data) =>{
        if(this.successMessage){
          this.eventsService.getEventById(String(this.eventId)).subscribe({
            next: (dataEvent) =>{
              this.EventList = dataEvent
            }
          })

        }
      }
    })
  }

  // private updateFormWithEventData(event: EventList): void{
  //   Object.keys(this.eventForm.controls).forEach(key =>{
  //     try {
  //       switch(key) {
  //         case 'name':
  //           this.eventForm.get(key)?.setValue(event.name || '');
  //           break;
  //         case 'description':
  //           this.eventForm.get(key)?.setValue(event.description || '');
  //           break;
  //         case 'content':
  //           this.eventForm.get(key)?.setValue(event.content || '');
  //           break;
  //         case 'start_time':
  //           this.eventForm.get(key)?.setValue(event.date_time_options[0].start_time || '');
  //           break;
  //         case 'end_time':
  //           this.eventForm.get(key)?.setValue(event.date_time_options[0].end_time || '');
  //           break;
  //         case 'online':
  //           this.eventForm.get(key)?.setValue(address.details_address || '');
  //           break;
  //         case 'wards':
  //           this.eventForm.get(key)?.setValue(address.wards || '');
  //           break;
  //         case 'districts':
  //           this.eventForm.get(key)?.setValue(address.districts || '');
  //           break;
  //         case 'country':
  //           this.eventForm.get(key)?.setValue(address.country || '');
  //           break;
  //         case 'city':
  //           this.eventForm.get(key)?.setValue(address.city || '');
  //           break;
  //         case 'profileImage':
  //           this.eventForm.get(key)?.setValue(event.profileImage || '');
  //           break;
  //         case 'password':
  //           this.eventForm.get(key)?.setValue('');  
  //           break; 
  //       }
  //     }
  //   })
  // }

  onSubmit(){

  }
  ngOnDestroy(): void {
    
  }

}


