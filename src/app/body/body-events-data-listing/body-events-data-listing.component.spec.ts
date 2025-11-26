import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getTestBedProviders } from '../../test-setup';

import { BodyEventsDataListingComponent } from './body-events-data-listing.component';

describe('BodyEventsDataListingComponent', () => {
  let component: BodyEventsDataListingComponent;
  let fixture: ComponentFixture<BodyEventsDataListingComponent>;

  beforeEach(async () => {
    
    await TestBed.configureTestingModule({
      providers: getTestBedProviders(),
      providers: getTestBedProviders(),
      imports: [BodyEventsDataListingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BodyEventsDataListingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
