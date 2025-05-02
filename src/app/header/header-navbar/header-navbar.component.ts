import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SharedService } from '../../service/shared.service';
import { auth } from '../../config/firebase.config';
import { getAuth, signOut } from 'firebase/auth';
import { AuthService } from '../../service/auth.service';
import { UsersService } from '../../service/users.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { User } from '../../types/userstype';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { SafeUrlService } from '../../service/santizer.service';
@Component({
  selector: 'app-header-navbar',
  standalone: true,
  imports: [RouterModule,CommonModule],
  templateUrl: './header-navbar.component.html',
  styleUrls: ['./header-navbar.component.css']
})
export class HeaderNavbarComponent implements OnInit {
  user: User | undefined;
  user$: Observable<User[]> | undefined;
  userCurrentId: string | undefined;
  userCurrentname: string | undefined;
  userCurrentImage: string | undefined;
  userCurrentEmail: string | undefined;
  isDropdownOpen: boolean = false;
  auth = getAuth();
  currentUserType: string | undefined;
  
  checkingForLogin: boolean = false;
  users: User[] = [];

  constructor(private sharedService: SharedService, private authService : AuthService, private router: Router, private usersService: UsersService, private sanitizer: DomSanitizer) {
    this.user$ = this.usersService.users$;
  }

  ngOnInit(): void {
    this.auth.onAuthStateChanged(user=>{
      this.checkingForLogin = !!user;
      if(user){
        const currentUserId = user.uid;
        this.userCurrentId = user.uid
        this.usersService.getCurrentUserById(currentUserId).subscribe(userData=>{
          this.userCurrentname = userData?.fullName ;
          this.userCurrentImage = userData?.profileImage || 'https://res.cloudinary.com/dpiqldk0y/image/upload/v1744575077/default-avatar_br3ffh.png'
          this.userCurrentEmail = userData?.email ;
          this.currentUserType = userData?.type
        } )
      }
    })
    this.usersService.users$.subscribe(users => {
      this.users = users;
    });
  }

  showDropdown(event: MouseEvent): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  onNavigate(): void {
    this.sharedService.hideBodyPage();
  }

  goToAccountSetting(): void {
    if (this.userCurrentId) {
      this.router.navigate(['/userprofile', this.userCurrentId]);
    }
  }
  goToManageEvent(): void{
    console.log('goToManageEvent clicked');
    if(this.userCurrentId){


      if(this.currentUserType === 'organizer'){
        this.router.navigate(['/manage-events']);
        console.log('navigating to manage-events');
      }
      else{
        console.log(this.currentUserType)
        this.router.navigate(['/userprofile', this.userCurrentId], {queryParams: {changeTab: 'tab3'}})
        
      }

      
    } else {
      console.log('User not logged in, redirecting to login');
      this.router.navigate(['/login']);
    }
  }

  onSignOut(){
    this.authService.logout().subscribe(state=>{
      console.log('Dang xuat thanh cong', state)
      this.checkingForLogin = false;
      this.router.navigate(['./login'])
    })
  }

  sanitizeImageUrl(url: string | undefined): SafeUrl | undefined {
    if (!url) return undefined;
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }

  goToTicketsManage(): void{
    if(this.userCurrentId){
      this.router.navigate(['/ticketsEvent']);
      console.log('navigating to ticketsEvent');
    }
    else{
      this.router.navigate(['/login']);
      console.log('User not logged in, redirecting to login');
    }
  }

  
}