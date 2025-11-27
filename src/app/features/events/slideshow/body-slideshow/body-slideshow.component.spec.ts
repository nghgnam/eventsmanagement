import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getTestBedProviders } from '../../../test-setup';

import { BodySlideshowComponent } from './body-slideshow.component';

describe('BodySlideshowComponent', () => {
  let component: BodySlideshowComponent;
  let fixture: ComponentFixture<BodySlideshowComponent>;

  beforeEach(async () => {
    
    await TestBed.configureTestingModule({
      imports: [BodySlideshowComponent],      providers: getTestBedProviders()
    })
    .compileComponents();

    fixture = TestBed.createComponent(BodySlideshowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
