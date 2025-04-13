import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from './home-page/home-page.component';
import { LoginActionDemoComponent } from './login-action-demo/login-action-demo.component';
import { RegisterActionDemoComponent } from './register-action-demo/register-action-demo.component';
import { UserInfomationComponent } from './user/user-infomation/user-infomation.component';
import { DetailEventComponent } from './body/detail-event/detail-event.component';
import { LayoutComponent } from './layout/layout.component';
import { ManageEventsComponent } from './manage-events/manage-events.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: HomePageComponent },
      { path: 'login', component: LoginActionDemoComponent },
      { path: 'register', component: RegisterActionDemoComponent },
      { path: 'user-information', component: UserInfomationComponent },
      { path: 'detail/:id', component: DetailEventComponent },
      { path: 'manage-events' , component: ManageEventsComponent},
      { path: '**', redirectTo: '' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { } 