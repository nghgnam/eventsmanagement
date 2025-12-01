import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getTestBedProviders } from '../../../../test-setup';

import { TicketEventsManageComponent } from './ticket-events-manage.component';

describe('TicketEventsManageComponent', () => {
  let component: TicketEventsManageComponent;
  let fixture: ComponentFixture<TicketEventsManageComponent>;

  beforeEach(() => {
    
    TestBed.configureTestingModule({
      providers: getTestBedProviders(),
      imports: [TicketEventsManageComponent]
    });
    fixture = TestBed.createComponent(TicketEventsManageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
