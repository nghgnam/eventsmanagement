import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getTestBedProviders } from '../../test-setup';

import { UserSettingAccountComponent } from './user-setting-account.component';

describe('UserSettingAccountComponent', () => {
  let component: UserSettingAccountComponent;
  let fixture: ComponentFixture<UserSettingAccountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserSettingAccountComponent],
      providers: getTestBedProviders()
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserSettingAccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
