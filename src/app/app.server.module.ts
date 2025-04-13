import { NgModule } from '@angular/core';
import { ServerModule } from '@angular/platform-server';
import { AppModule } from './app.module';
import { AppComponent } from './app.component';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { LoginActionDemoComponent } from './login-action-demo/login-action-demo.component';
import { RegisterActionDemoComponent } from './register-action-demo/register-action-demo.component';
import { HomePageComponent } from './home-page/home-page.component';

@NgModule({
  imports: [
    AppModule,
    ServerModule,
    RouterModule,
    HttpClientModule,
    LoginActionDemoComponent,
    RegisterActionDemoComponent,
    HomePageComponent,
    AppComponent
  ]
})
export class AppServerModule { } 