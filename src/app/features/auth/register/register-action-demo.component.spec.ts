import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getTestBedProviders } from '../../../test-setup';

import { RegisterActionDemoComponent } from './register-action-demo.component';

describe('RegisterActionDemoComponent', () => {
  let component: RegisterActionDemoComponent;
  let fixture: ComponentFixture<RegisterActionDemoComponent>;

  beforeEach(async () => {
    
    await TestBed.configureTestingModule({
      providers: getTestBedProviders(),
      providers: getTestBedProviders(),
      imports: [RegisterActionDemoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterActionDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
