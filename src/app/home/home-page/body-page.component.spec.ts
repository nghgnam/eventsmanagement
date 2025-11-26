import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getTestBedProviders } from '../../test-setup';

import { BodyPageComponent } from './body-page.component';

describe('BodyPageComponent', () => {
  let component: BodyPageComponent;
  let fixture: ComponentFixture<BodyPageComponent>;

  beforeEach(async () => {
    
    await TestBed.configureTestingModule({
      providers: getTestBedProviders(),
      providers: getTestBedProviders(),
      imports: [BodyPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BodyPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
