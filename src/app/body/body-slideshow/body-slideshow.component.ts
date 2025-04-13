import { Component } from '@angular/core';
import { NgImageSliderModule } from 'ng-image-slider';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-body-slideshow',
  standalone: true,
  imports: [CommonModule, NgImageSliderModule],
  templateUrl: './body-slideshow.component.html',
  styleUrls: ['./body-slideshow.component.css']
})
export class BodySlideshowComponent {
  imageObject = [
    {
      image: 'assets/images/images_1.jpg',
      thumbImage: 'assets/images/images_1.jpg',
      title: 'Blood Donation Drive - Save Lives Today'
    },
    {
      image: 'assets/images/images_2.jpg',
      thumbImage: 'assets/images/images_2.jpg',
      title: 'Community Blood Bank Event'
    },
    {
      image: 'assets/images/images_3.png',
      thumbImage: 'assets/images/images_3.png',
      title: 'Emergency Blood Donation Campaign'
    }
  ];
}
