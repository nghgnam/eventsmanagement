import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getTestBedProviders } from '../../../../test-setup';

import { HeaderNavbarComponent } from './header-navbar.component';

describe('HeaderNavbarComponent', () => {
  let component: HeaderNavbarComponent;
  let fixture: ComponentFixture<HeaderNavbarComponent>;

  beforeEach(async () => {
    
    await TestBed.configureTestingModule({
      providers: getTestBedProviders(),
      providers: getTestBedProviders(),
      imports: [HeaderNavbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
