import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutRouterComponent } from './layout-router.component';

describe('LayoutRouterComponent', () => {
  let component: LayoutRouterComponent;
  let fixture: ComponentFixture<LayoutRouterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutRouterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LayoutRouterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
