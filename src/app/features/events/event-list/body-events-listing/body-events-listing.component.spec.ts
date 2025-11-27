import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getTestBedProviders } from '../../../test-setup';

import { BodyEventsListingComponent } from './body-events-listing.component';

describe('BodyEventsListingComponent', () => {
  let component: BodyEventsListingComponent;
  let fixture: ComponentFixture<BodyEventsListingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BodyEventsListingComponent],
      providers: getTestBedProviders()
    })
    .compileComponents();

    fixture = TestBed.createComponent(BodyEventsListingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
