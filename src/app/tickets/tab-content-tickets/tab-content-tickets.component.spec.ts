import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabContentTicketsComponent } from './tab-content-tickets.component';

describe('TabContentTicketsComponent', () => {
  let component: TabContentTicketsComponent;
  let fixture: ComponentFixture<TabContentTicketsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TabContentTicketsComponent]
    });
    fixture = TestBed.createComponent(TabContentTicketsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
