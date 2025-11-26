import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getTestBedProviders } from '../../test-setup';

import { HomePageComponent } from './home-page.component';

describe('HomePageComponent', () => {
  let component: HomePageComponent;
  let fixture: ComponentFixture<HomePageComponent>;

  beforeEach(async () => {
    
    await TestBed.configureTestingModule({
      providers: getTestBedProviders(),
      providers: getTestBedProviders(),
      imports: [HomePageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
