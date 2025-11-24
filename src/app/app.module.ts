import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { HomePageComponent } from './home-page/home-page.component';
import { LoginActionDemoComponent } from './login-action-demo/login-action-demo.component';
import { RegisterActionDemoComponent } from './register-action-demo/register-action-demo.component';
import { UserInfomationComponent } from './user/user-infomation/user-infomation.component';
import { DetailEventComponent } from './body/detail-event/detail-event.component';
import { LayoutComponent } from './layout/layout.component';
import { HeaderSearchComponent } from './header/header-search/header-search.component';
import { ManageEventsComponent } from './management-event/manage-events/manage-events.component';

@NgModule({
  declarations: [
  ],
  imports: [
    HttpClientModule,
    HomePageComponent,
    LoginActionDemoComponent,
    RegisterActionDemoComponent,
    UserInfomationComponent,
    DetailEventComponent,
    LayoutComponent,
    HeaderSearchComponent,
    ManageEventsComponent,
    AppComponent
  ],
  providers: [

  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class AppModule { } 