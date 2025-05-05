import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http';
import { HomePageComponent } from './home-page/home-page.component';
import { LoginActionDemoComponent } from './login-action-demo/login-action-demo.component';
import { RegisterActionDemoComponent } from './register-action-demo/register-action-demo.component';
import { UserInfomationComponent } from './user/user-infomation/user-infomation.component';
import { DetailEventComponent } from './body/detail-event/detail-event.component';
import { LayoutComponent } from './layout/layout.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HeaderSearchComponent } from './header/header-search/header-search.component';
import { ManageEventsComponent } from './management-event/manage-events/manage-events.component';

@NgModule({
  declarations: [
    // AppComponent removed from here
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
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
  providers: []
})
export class AppModule { } 