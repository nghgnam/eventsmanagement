import { Routes } from '@angular/router';
import { RegisterActionDemoComponent } from './register-action-demo/register-action-demo.component';
import { LoginActionDemoComponent } from './login-action-demo/login-action-demo.component';
import { HomePageComponent } from './home-page/home-page.component';
import { AppComponent } from './app.component';
import { DetailEventComponent } from './body/detail-event/detail-event.component';
import { LayoutRouterComponent } from './layout-router/layout-router.component';
import { BodyPageComponent } from './body/body-page/body-page.component';
import { UserInfomationComponent } from './user/user-infomation/user-infomation.component';
import { ManageEventsComponent } from './management-event/manage-events/manage-events.component'
import { TicketEventsManageComponent } from './tickets/ticket-events-manage/ticket-events-manage.component';
export const routes: Routes = [
  {
    path: '',
    component: LayoutRouterComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomePageComponent },
      { path: 'detail/:id', component: DetailEventComponent },
      { path: 'login', component: LoginActionDemoComponent },
      { path: 'register', component: RegisterActionDemoComponent },
      { path: 'body', component: BodyPageComponent },
      {
        path: 'manage-events',
        loadComponent: () => import ('./management-event/manage-events/manage-events.component').then(m => m.ManageEventsComponent)
      },
      { path: 'userprofile/:id', component: UserInfomationComponent },
      { path: 'ticketsEvent', component: TicketEventsManageComponent},
      {
        path: 'search-results',
        loadComponent: () => import('./search-results/search-results.component').then(m => m.SearchResultsComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
