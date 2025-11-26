import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getTestBedProviders } from '../../../../test-setup';

import { EditEventComponent } from './edit-event.component';

describe('EditEventComponent', () => {
  let component: EditEventComponent;
  let fixture: ComponentFixture<EditEventComponent>;

  beforeEach(() => {
    
    TestBed.configureTestingModule({
      providers: getTestBedProviders(),
      imports: [EditEventComponent]
    });
    fixture = TestBed.createComponent(EditEventComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
