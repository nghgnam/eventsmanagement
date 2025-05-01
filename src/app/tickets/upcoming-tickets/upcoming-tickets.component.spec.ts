import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpcomingTicketsComponent } from './upcoming-tickets.component';

describe('UpcomingTicketsComponent', () => {
  let component: UpcomingTicketsComponent;
  let fixture: ComponentFixture<UpcomingTicketsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UpcomingTicketsComponent]
    });
    fixture = TestBed.createComponent(UpcomingTicketsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
