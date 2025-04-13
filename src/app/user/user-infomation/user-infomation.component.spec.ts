import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserInfomationComponent } from './user-infomation.component';

describe('UserInfomationComponent', () => {
  let component: UserInfomationComponent;
  let fixture: ComponentFixture<UserInfomationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserInfomationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserInfomationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
