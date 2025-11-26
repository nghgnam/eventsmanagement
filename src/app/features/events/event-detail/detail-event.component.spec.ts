import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getTestBedProviders } from '../../../test-setup';

import { DetailEventComponent } from './detail-event.component';

describe('DetailEventComponent', () => {
  let component: DetailEventComponent;
  let fixture: ComponentFixture<DetailEventComponent>;

  beforeEach(async () => {
    
    await TestBed.configureTestingModule({
      providers: getTestBedProviders(),
      providers: getTestBedProviders(),
      imports: [DetailEventComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetailEventComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
