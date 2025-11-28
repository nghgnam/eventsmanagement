import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getTestBedProviders } from '../../test-setup';

import { FooterPageComponent } from './footer-page.component';

describe('FooterPageComponent', () => {
  let component: FooterPageComponent;
  let fixture: ComponentFixture<FooterPageComponent>;

  beforeEach(async () => {
    
    await TestBed.configureTestingModule({
      imports: [FooterPageComponent],      providers: getTestBedProviders()
    })
    .compileComponents();

    fixture = TestBed.createComponent(FooterPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
