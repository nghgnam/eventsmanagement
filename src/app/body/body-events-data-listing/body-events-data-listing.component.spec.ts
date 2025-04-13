import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BodyEventsDataListingComponent } from './body-events-data-listing.component';

describe('BodyEventsDataListingComponent', () => {
  let component: BodyEventsDataListingComponent;
  let fixture: ComponentFixture<BodyEventsDataListingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
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
