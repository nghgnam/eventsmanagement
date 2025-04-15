import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { Organizer, User, UserType } from '../../types/userstype';
import { UsersService } from '../../service/users.service';
import { CommonModule } from '@angular/common';
import { auth } from '../../config/firebase.config';
import { getAuth , updatePassword} from 'firebase/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { CloudinaryService } from '../../service/cloudinary.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';
import * as countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Timestamp } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { AddressInformationService } from '../../service/addressInformation.service';
import { skip } from 'rxjs/operators';
interface CloudinaryResponse {
  secure_url: string;
}

@Component({
  selector: 'app-user-infomation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-infomation.component.html',
  styleUrls: ['./user-infomation.component.css']
})
export class UserInfomationComponent implements OnInit, OnDestroy {
  user$: Observable<User[]>;
  currentUser: User | undefined;
  imageUrl: string | undefined;
  private subscriptions: Subscription[] = [];
  userForm: FormGroup;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  changeTab : string  = 'tab1';
  newpassword: string = '';
  countries: { code: string, name: string }[] = [];
  getCountryCallingCodes: { code: string, dialCode: string }[] = [];
  currentRole: string ='';
  activeOF: boolean =  false;
  wardsValue:any[] = [];
  districtsValue:any[] =[];
  citiesValue:any[]= [];

  filterDistricts:any[]= [];
  filterWards:any[] =[];

  
  constructor(
    private userService: UsersService, 
    private router: Router, 
    private route: ActivatedRoute, 
    private cloudinaryService: CloudinaryService,
    private sanitizer: DomSanitizer,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private addressInfor: AddressInformationService
  ) {
    this.user$ = this.userService.users$;
    this.userForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      countryCode: [''],
      details_address: ['', [Validators.required]],
      wards: ['', [Validators.required]],
      districts: ['', [Validators.required]],
      country: ['', [Validators.required]],
      city: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      dateOfBirth: ['', [Validators.required]],
      password: ['', Validators.required],
      NewPassword: ['', [Validators.required, Validators.minLength(6)]],
      profileImage: [''],
      companyName: ['' , Validators.required],
      identifier: ['', [Validators.required , Validators.pattern('^\\d{12}$')]],
      jobTitle: ['', Validators.required],
      postalCode: ['', Validators.required]
    });
    countries.registerLocale(en);

    
  }

  ngOnInit(): void {


    this.addressInfor.getCities()
    .subscribe(data =>{
      if(data){
        this.citiesValue = data
      }
    })
    this.addressInfor.getDistricts()
    .subscribe(data =>{
      if(data){
        this.districtsValue = data
      }
    })
    this.addressInfor.getWards()
    .subscribe(data =>{
      if(data){
        this.wardsValue = data
      }
    })

    this.userForm.get('city')?.valueChanges
    .pipe(skip(1))
    .subscribe(dataChange =>{
      if(dataChange){
        this.filterDistricts = this.districtsValue.filter(
          d=> d.parrent_code === dataChange.code
        );

        this.userForm.get('districts')?.reset();
        this.filterDistricts = []
      }
    })

    this.userForm.get('districts')?.valueChanges
    .pipe(skip(1))
    .subscribe(dataChange =>{
      if(dataChange){
        this.filterWards = this.wardsValue.filter(
          d=> d.parrent_code === dataChange.code
        );

        this.userForm.get('wards')?.reset();
        this.wardsValue = []
      }
    })

    this.isLoading = true;
    const authInstance = getAuth();
    this.countries = this.getCountryList();
    try {
      const countryCodes = getCountries() || [];
      this.getCountryCallingCodes = countryCodes.map(code => ({
        code,
        dialCode: getCountryCallingCode(code)?.toString() || ''
      }));
      
    } catch (error) {
      console.error('Error getting country codes:', error);
      this.getCountryCallingCodes = [];
    } 

    
    const unsubscribe = authInstance.onAuthStateChanged(user => {
      if (user) {
        const userId = user.uid;
        const userSubscription = this.userService.getCurrentUserById(userId)
          .pipe(finalize(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          }))
          .subscribe({
            next: (dataUser) => {
              if (dataUser) {
                console.log('User data received:', dataUser);
                this.currentRole = dataUser.type
          this.currentUser = dataUser;
                this.imageUrl = dataUser.profileImage;           
                this.updateFormWithUserData(dataUser);
                this.cdr.detectChanges();
              } else {
                console.error('No user data found');
                this.errorMessage = 'No user data found. Please try logging in again.';
                this.cdr.detectChanges();
              }
            },
            error: (error) => {
              console.error('Error fetching user data:', error);
              this.errorMessage = 'Failed to load user data. Please try again later.';
              this.cdr.detectChanges();
            }
          });
        this.subscriptions.push(userSubscription);
      } else {
        this.isLoading = false;
        this.errorMessage = 'Please log in to view your profile';
        this.cdr.detectChanges();
      }
    });

    this.subscriptions.push(new Subscription(() => unsubscribe()));
  }

  private updateFormWithUserData(user: User): void {   
    console.log('Updating form with user data:', user);
    let formattedDOB = '';
    if (user.dateOfBirth) {
      try {
        if (typeof user.dateOfBirth.toDate === 'function') {
          formattedDOB = user.dateOfBirth.toDate().toISOString().split('T')[0];
        }
        else if (user.dateOfBirth instanceof Date) {
          formattedDOB = user.dateOfBirth.toISOString().split('T')[0];
        }
        else if (typeof user.dateOfBirth === 'string') {
          formattedDOB = new Date(user.dateOfBirth).toISOString().split('T')[0];
        }
      } catch (error) {
        console.error('Error formatting date:', error);
      }
    }
    let organization: Organizer['organization'] 
    const address = user.address || {};
    if(this.isOrangizer(user)){
      organization = user.organization || {};
    }
    Object.keys(this.userForm.controls).forEach(key => {
      try {
        switch(key) {
          case 'firstName':
            this.userForm.get(key)?.setValue(user.firstName || '');
            break;
          case 'lastName':
            this.userForm.get(key)?.setValue(user.lastName || '');
            break;
          case 'phoneNumber':
            this.userForm.get(key)?.setValue(user.phoneNumber || '');
            break;
          case 'email':
            this.userForm.get(key)?.setValue(user.email || '');
            break;
          case 'dateOfBirth':
            this.userForm.get(key)?.setValue(formattedDOB);
            break;
          case 'details_address':
            this.userForm.get(key)?.setValue(address.details_address || '');
            break;
          case 'wards':
              this.userForm.get(key)?.setValue(address.wards || '');
              break;
          case 'districts':
            this.userForm.get(key)?.setValue(address.districts || '');
            break;  
          case 'country':
            this.userForm.get(key)?.setValue(address.country || '');
            break;
          case 'city':
            this.userForm.get(key)?.setValue(address.city || '');
            break;
          case 'profileImage':
            this.userForm.get(key)?.setValue(user.profileImage || '');
            break;
          case 'password':
            this.userForm.get(key)?.setValue('');  
            break;
          case 'companyName'  :
            this.userForm.get(key)?.setValue(organization?.companyName || '');
            break;
          case 'identifier'  :
            this.userForm.get(key)?.setValue(organization?.identifier || '');
            break;
          case 'jobTitle'  :
            this.userForm.get(key)?.setValue(organization?.jobTitle || '');
            break;
          case 'postalCode'  :
            this.userForm.get(key)?.setValue(organization?.postalCode || '');
            break;      
        }
      } catch (error) {
        console.error(`Error setting value for ${key}:`, error);
      }
    });
    this.cdr.detectChanges();
  }

  isOrangizer(user: User) :user is Organizer{
    return user.type === 'organizer'
  } 

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getCountryList(): { code: string, name: string }[] {
    try {
    const countryObj = countries.getNames("en", { select: "official" }) || {};
    return Object.entries(countryObj).map(([code, name]) => ({
      code,
      name
    }));
    } catch (error) {
      console.error('Error getting country list:', error);
      return [];
    }
  }

  sanitizeImageUrl(imageUrl: string | undefined): SafeUrl | undefined {
    if (!imageUrl || imageUrl.trim() === '') {
      return undefined;
    }
    return this.sanitizer.bypassSecurityTrustUrl(imageUrl);
  }
  
  onSelectedFile(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput?.files?.[0];
    
    if (!file) {
      this.errorMessage = 'Please select a file';
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      this.errorMessage = 'File size exceeds 5MB limit';
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'Invalid file type. Only JPEG, PNG and GIF are allowed';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.cloudinaryService.upLoadImage(file).subscribe({
      next: (response: CloudinaryResponse) => {
          this.imageUrl = response.secure_url;
        this.userForm.patchValue({ profileImage: response.secure_url });
        this.isLoading = false;
      },
      error: (error: Error) => {
        console.error('Error uploading image:', error);
        this.errorMessage = 'Failed to upload image. Please try again.';
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly';
      return;
    }

    if (!this.currentUser?.id) {
      this.errorMessage = 'No user data available';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const dobValue = this.userForm.get('dateOfBirth')?.value;
    let updatedDOB;
    
    if (dobValue) {
      try {
        const convertedDOB = new Date(dobValue);
        if (!isNaN(convertedDOB.getTime())) {
          updatedDOB = Timestamp.fromDate(convertedDOB);
        }
      } catch (error) {
        console.error('Error converting date:', error);
        this.errorMessage = 'Invalid date format';
        this.isSaving = false;
        return;
      }
    }

    const updatedUser: Partial<User> = {
      firstName: this.userForm.get('firstName')?.value?.trim(),
      lastName: this.userForm.get('lastName')?.value?.trim(),
      phoneNumber: this.userForm.get('phoneNumber')?.value?.trim(),
      address: {
        details_address: this.userForm.get('details_address')?.value?.trim(),
        wards: this.userForm.get('wards')?.value?.trim(),
        districts: this.userForm.get('districts')?.value?.trim(),
        city: this.userForm.get('city')?.value?.trim(),
        country: this.userForm.get('country')?.value?.trim()
      },
      profileImage: this.userForm.get('profileImage')?.value,
      email: this.userForm.get('email')?.value,
      dateOfBirth: updatedDOB,
      password: this.userForm.get('NewPassword')?.value
    };

    const newPassword = this.userForm.get('NewPassword')?.value?.trim();
    if (newPassword) {
      updatedUser.password = newPassword;
    }

    this.userService.updateUserProfile(String(this.currentUser.id), updatedUser)
      .pipe(finalize(() => {
        this.isSaving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.successMessage = 'Profile updated successfully';
          setTimeout(() => {
            this.successMessage = '';
            this.cdr.detectChanges();
          }, 3000);
        },
        error: (error) => {
          console.error('Error updating user:', error);
          this.errorMessage = 'Failed to update profile. Please try again.';
          this.cdr.detectChanges();
        }
      });
  }
  
  activeOrganizer(){
    const authInstance = getAuth();
    const user = authInstance.currentUser;
    let updateOrganizer = {};

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (!user) {
      this.errorMessage = 'User not authenticated';
      this.isSaving = false;
      return;
    }

    if (!this.currentUser?.id) {
      this.errorMessage = 'User ID not found';
      this.isSaving = false;
      return;
    }

    if(this.activeOF === true) {
      const companyName = this.userForm.get('companyName')?.value;
      const identifier = this.userForm.get('identifier')?.value;
      const jobTitle = this.userForm.get('jobTitle')?.value;
      const postalCode = this.userForm.get('postalCode')?.value;

      if (!companyName || !identifier || !jobTitle || !postalCode) {
        this.errorMessage = 'Please fill in all organization details';
        this.isSaving = false;
        return;
      }

      updateOrganizer = {
        organization: {
          companyName,
          identifier,
          jobTitle,
          postalCode
        },
        type: 'organizer'
      } as Partial<Organizer>;
    }

    this.userService.activeOrganizer(String(this.currentUser.id), updateOrganizer)
      .pipe(finalize(() => {
        this.isSaving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.successMessage = "Organizer activated successfully";
          setTimeout(() => {
            this.successMessage = '';
            this.cdr.detectChanges();
          }, 3000);
        },
        error: (error) => {
          console.error('Error activating organizer:', error);
          this.errorMessage = "Failed to activate organizer. Please try again.";
          this.cdr.detectChanges();
        }
      });
  }

  onChangeType():void{
    this.activeOF =! this.activeOF
    console.log(this.activeOF)
  }
  changeTabSelected(tab: string): void{
    this.changeTab = tab
  }

  async updatePasswordHandler(): Promise<void> {
    const authInstance = getAuth();
    const user = authInstance.currentUser;
  
    if (!user) {
      this.errorMessage = 'User not authenticated';
      return;
    }
  
    const currentPassword = this.userForm.get('password')?.value;
    const newPassword = this.userForm.get('NewPassword')?.value;
  
    if (!currentPassword || !newPassword) {
      this.errorMessage = 'Please fill in both current and new password';
      return;
    }
  
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
  
    try {
      const credential = EmailAuthProvider.credential(
        user.email || '',
        currentPassword
      );
  
      
      await reauthenticateWithCredential(user, credential);
  
      
      await updatePassword(user, newPassword);
  
      this.successMessage = 'Password updated successfully!';
    } catch (error: any) {
      console.error('Failed to update password wrong current password');
      this.errorMessage = 'Failed to update password, wrong current password';
    } finally {
      this.isSaving = false;
    }
  }
  

  get firstName() { return this.userForm.get('firstName'); }
  get lastName() { return this.userForm.get('lastName'); }
  get phoneNumber() { return this.userForm.get('phoneNumber'); }
  get details_address() { return this.userForm.get('details_address'); }
  get wards() { return this.userForm.get('wards'); }
  get districts() { return this.userForm.get('districts'); }
  get country() { return this.userForm.get('country'); }
  get city() { return this.userForm.get('city'); }
  get email() {return this.userForm.get('email');}
  get dateOfBirth() {return this.userForm.get('dateOfBirth');}
  get password() {return this.userForm.get('password');}
  get NewPassword() {return this.userForm.get('NewPassword')}
  get companyName() {return this.userForm.get('companyName');}
  get identifier() {return this.userForm.get('identifier');}
  get jobTitle() {return this.userForm.get('jobTitle');}
  get postalCode() {return this.userForm.get('postalCode')}
}
