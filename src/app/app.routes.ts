import { Routes } from '@angular/router';
import { BodyPageComponent } from './features/events/home/body-page/body-page.component';
import { DetailEventComponent } from './features/events/event-detail/detail-event/detail-event.component';
import { HomePageComponent } from './home-page/home-page.component';
import { LayoutRouterComponent } from './layout-router/layout-router.component';
import { LoginActionDemoComponent } from './features/auth/login/login/login-action-demo.component';
import { RegisterActionDemoComponent } from './features/auth/register/register/register-action-demo.component';
import { TicketEventsManageComponent } from './features/tickets/ticket-events-manage/ticket-events-manage.component';
import { UserInformationComponent } from './features/users/profile/user-information/user-information.component';
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
        loadComponent: () => import('./features/events/event-management/manage-events/manage-events.component').then(m => m.ManageEventsComponent)
      },
      { path: 'userprofile/:id', component: UserInformationComponent },
      { path: 'ticketsEvent', component: TicketEventsManageComponent},
      {
        path: 'search-results',
        loadComponent: () => import('./features/events/search/search-results/search-results.component').then(m => m.SearchResultsComponent)
      },
      {
        path: 'following',
        loadComponent: () => import('./features/users/following/following-organizers/following-organizers.component').then(m => m.FollowingOrganizersComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
