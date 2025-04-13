import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderBandingComponent } from './header-banding.component';

describe('HeaderBandingComponent', () => {
  let component: HeaderBandingComponent;
  let fixture: ComponentFixture<HeaderBandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderBandingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderBandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
