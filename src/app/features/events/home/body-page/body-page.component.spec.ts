import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getTestBedProviders } from '../../../test-setup';

import { BodyPageComponent } from './body-page.component';

describe('BodyPageComponent', () => {
  let component: BodyPageComponent;
  let fixture: ComponentFixture<BodyPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BodyPageComponent],
      providers: getTestBedProviders()
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
