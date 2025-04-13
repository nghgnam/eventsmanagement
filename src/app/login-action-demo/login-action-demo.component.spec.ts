import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginActionDemoComponent } from './login-action-demo.component';

describe('LoginActionDemoComponent', () => {
  let component: LoginActionDemoComponent;
  let fixture: ComponentFixture<LoginActionDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginActionDemoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginActionDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
