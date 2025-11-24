import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PastTicketsComponent } from './past-tickets.component';

describe('PastTicketsComponent', () => {
  let component: PastTicketsComponent;
  let fixture: ComponentFixture<PastTicketsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PastTicketsComponent]
    });
    fixture = TestBed.createComponent(PastTicketsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
