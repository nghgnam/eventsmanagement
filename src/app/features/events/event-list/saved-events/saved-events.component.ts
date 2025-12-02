import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

interface SavedEvent {
  id: string;
  name: string;
  date: Date;
  location: string;
  imageUrl: string;
  price: number;
  organizer: string;
  saved: boolean;
}

@Component({
  selector: 'app-saved-events',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './saved-events.component.html',
  styleUrls: ['./saved-events.component.css']
})
export class SavedEventsComponent {
  savedEvents: SavedEvent[] = [
    {
      id: 'evt-1',
      name: 'Blood Donation Day 2025',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      location: 'Bệnh viện 108, Hà Nội',
      imageUrl: 'https://images.pexels.com/photos/4226219/pexels-photo-4226219.jpeg',
      price: 0,
      organizer: 'Red Cross VN',
      saved: true
    },
    {
      id: 'evt-2',
      name: 'Charity Music Night',
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      location: 'Nhà hát Lớn, Hà Nội',
      imageUrl: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg',
      price: 250000,
      organizer: 'Music For Good',
      saved: true
    }
  ];

  toggleSave(event: SavedEvent, e: MouseEvent): void {
    e.stopPropagation();
    event.saved = !event.saved;
  }
}


