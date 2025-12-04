import { Routes } from '@angular/router';
import { DetailEventComponent } from './features/events/event-detail/detail-event/detail-event.component';
import { HomePageComponent } from './home-page/home-page.component';
import { LayoutRouterComponent } from './layout-router/layout-router.component';
import { LoginActionDemoComponent } from './features/auth/login/login/login-action-demo.component';
import { RegisterActionDemoComponent } from './features/auth/register/register/register-action-demo.component';
import { TicketEventsManageComponent } from './features/tickets/ticket-events-manage/ticket-events-manage.component';
import { UserInformationComponent } from './features/users/profile/user-information/user-information.component';
import { NotFoundComponent } from './shared/components/not-found/not-found.component';
import { authGuard } from './core/guards/authGuard.guard';
import { MyTicketsComponent } from './features/tickets/my-tickets/my-tickets.component';
import { TicketDetailComponent } from './features/tickets/ticket-detail/ticket-detail.component';
import { SavedEventsComponent } from './features/events/event-list/saved-events/saved-events.component';
export const routes: Routes = [
  {
    path: '',
    component: LayoutRouterComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomePageComponent },
      { path: 'detail/:id', canActivate: [authGuard], component: DetailEventComponent },
      { path: 'login', component: LoginActionDemoComponent },
      { path: 'register', component: RegisterActionDemoComponent },
      // Legacy path for organizer manage events (kept for backward compatibility)
      {
        path: 'manage-events',
        redirectTo: 'organizer/events',
        pathMatch: 'full'
      },
      { path: 'userprofile/:id', canActivate: [authGuard], component: UserInformationComponent },
      { path: 'ticketsEvent', canActivate: [authGuard], component: TicketEventsManageComponent},
      { 
        path: 'tickets-manage', 
        canActivate: [authGuard],
        component: TicketEventsManageComponent
      },
      {
        path: 'my-tickets',
        canActivate: [authGuard],
        component: MyTicketsComponent
      },
      {
        path: 'my-tickets/:id',
        canActivate: [authGuard],
        component: TicketDetailComponent
      },
      {
        path: 'account',
        canActivate: [authGuard],
        loadComponent: () => import('./features/users/settings/user-setting-account/user-setting-account.component').then(m => m.UserSettingAccountComponent)
      },
      {
        path: 'search-results',
        canActivate: [authGuard],
        loadComponent: () => import('./features/events/search/search-results/search-results.component').then(m => m.SearchResultsComponent)
      },
      {
        path: 'following',
        canActivate: [authGuard],
        loadComponent: () => import('./features/users/following/following-organizers/following-organizers.component').then(m => m.FollowingOrganizersComponent)
      },
      {
        path: 'saved-events',
        canActivate: [authGuard],
        component: SavedEventsComponent
      },
      // Organizer group routes
      {
        path: 'organizer',
        canActivate: [authGuard],
        children: [
          {
            path: 'events',
            loadComponent: () => import('./features/events/event-management/manage-events/manage-events.component').then(m => m.ManageEventsComponent)
          },
          {
            path: 'dashboard/:eventId',
            loadComponent: () => import('./features/organizer/event-dashboard/event-dashboard.component').then(m => m.EventDashboardComponent)
          },
          {
            path: 'check-in/:eventId',
            loadComponent: () => import('./features/organizer/check-in/check-in.component').then(m => m.CheckInComponent)
          },
          {
            path: 'attendees/:eventId',
            loadComponent: () => import('./features/organizer/attendee-management/attendee-management.component').then(m => m.AttendeeManagementComponent)
          },
          {
            path: 'coupons',
            loadComponent: () => import('./features/organizer/coupon-management/coupon-management.component').then(m => m.CouponManagementComponent)
          },
          {
            path: 'coupons/:eventId',
            loadComponent: () => import('./features/organizer/coupon-management/coupon-management.component').then(m => m.CouponManagementComponent)
          },
          {
            path: '',
            redirectTo: 'events',
            pathMatch: 'full'
          }
        ]
      },
      {
        path: 'not-found',
        component: NotFoundComponent
      }
    ]
  },
  { path: '**', component: NotFoundComponent }
];
