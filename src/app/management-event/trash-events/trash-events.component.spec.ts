import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getTestBedProviders } from '../../test-setup';

import { TrashEventsComponent } from './trash-events.component';

describe('TrashEventsComponent', () => {
  let component: TrashEventsComponent;
  let fixture: ComponentFixture<TrashEventsComponent>;

  beforeEach(() => {
    
    TestBed.configureTestingModule({
      providers: getTestBedProviders(),
      imports: [TrashEventsComponent]
    });
    fixture = TestBed.createComponent(TrashEventsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
