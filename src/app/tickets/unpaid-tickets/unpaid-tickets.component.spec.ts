import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnpaidTicketsComponent } from './unpaid-tickets.component';

describe('UnpaidTicketsComponent', () => {
  let component: UnpaidTicketsComponent;
  let fixture: ComponentFixture<UnpaidTicketsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UnpaidTicketsComponent]
    });
    fixture = TestBed.createComponent(UnpaidTicketsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
