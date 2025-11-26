import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { EmailAuthProvider, getAuth, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import * as countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';
import { Observable, Subscription } from 'rxjs';
import { finalize, skip } from 'rxjs/operators';
import { AddressInformationService } from '../../core/services/addressInformation.service';
import { AuthService } from '../../core/services/auth.service';
import { CloudinaryService } from '../../core/services/cloudinary.service';
import { UsersService } from '../../core/services/users.service';
import { Follows } from '../../core/models/followtype';
import { Organizer, User } from '../../core/models/userstype';


interface CloudinaryResponse {
  secure_url: string;
}

interface FollowWithOrganizer extends Follows {
  organizer?: {
    id: string | number;
    fullName: string;
    profileImage?: string;
    organization?: {
      companyName: string;
    };
  };
}

interface LocationBase {
  code: string;
  name: string;
}

interface LocationWithParent extends LocationBase {
  parent_code: string;
}

type City = LocationBase;
type District = LocationWithParent;
type Ward = LocationWithParent;

type NamedLocationValue = LocationBase | { name?: string } | string | null | undefined;

@Component({
  selector: 'app-user-infomation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './user-infomation.component.html',
  styleUrls: ['./user-infomation.component.css'],
})
export class UserInfomationComponent implements OnInit, OnDestroy {
  private userService = inject(UsersService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cloudinaryService = inject(CloudinaryService);
  private sanitizer = inject(DomSanitizer);
  private fb = inject(FormBuilder);
  private location = inject(AddressInformationService);
  private authService = inject(AuthService);

  user$: Observable<User[]>;
  currentUser = signal<User | undefined>(undefined);
  imageUrl: string | undefined;
  private subscriptions: Subscription[] = [];
  userForm: FormGroup;
  changePasswordForm: FormGroup;
  OrganizerForm: FormGroup;
  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = '';
  successMessage = '';
  changeTab: string = 'tab1';
  newpassword: string = '';
  countries: { code: string; name: string }[] = [];
  getCountryCallingCodes: { code: string; dialCode: string }[] = [];
  currentRole: string = '';
  activeOF = false;
  citiesValue: City[] = [];
  districtsValue: District[] = [];
  wardsValue: Ward[] = [];
  districtsWithCities: District[] = [];
  wardsWithDistricts: Ward[] = [];
  currentCity = '';

  followedOrganizers: FollowWithOrganizer[] | Follows[] = [];

  constructor() {
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

      profileImage: ['']

    });

    this.changePasswordForm = this.fb.group({
      password: ['', Validators.required],
      NewPassword: ['', [Validators.required, Validators.minLength(6)]],
    })

    this.OrganizerForm = this.fb.group({
      companyName: ['' , Validators.required],
      identifier: ['', [Validators.required , Validators.pattern('^\\d{12}$')]],
      jobTitle: ['', Validators.required],
      postalCode: ['', Validators.required]
    })
    countries.registerLocale(en);

    
  }

  ngOnInit(): void {

    this.route.queryParams.subscribe(tab => {
      this.changeTab = tab['changeTab'];
      this.errorMessage = 'Please become Organizer to active';
    });

    this.location.getCities().subscribe(dataCities => {
      this.citiesValue = dataCities as unknown as City[];
    });
    this.location.getDistricts().subscribe(dataDistricts => {
      this.districtsValue = dataDistricts as unknown as District[];
    });
    this.location.getWards().subscribe(dataWards => {
      this.wardsValue = dataWards as unknown as Ward[];
    });
    this.userForm
      .get('city')
      ?.valueChanges.pipe(skip(1))
      .subscribe(selectedCity => {
        const cityValue = selectedCity as City | undefined;
        if (cityValue?.code) {
          this.districtsWithCities = this.districtsValue.filter(
            d => d.parent_code === cityValue.code,
          );

          this.userForm.get('districts')?.reset();
          this.wardsWithDistricts = [];
        } else {
          this.districtsWithCities = [];
          this.wardsWithDistricts = [];
        }
      });

    this.userForm
      .get('districts')
      ?.valueChanges.pipe(skip(1))
      .subscribe(selectedDistricts => {
        const districtValue = selectedDistricts as District | undefined;
        if (districtValue?.code) {
          this.wardsWithDistricts = this.wardsValue.filter(
            d => d.parent_code === districtValue.code,
          );

          this.userForm.get('wards')?.reset();
        } else {
          this.wardsWithDistricts = [];
        }
      });
    this.isLoading.set(true);
    const authInstance = getAuth();
    this.countries = this.getCountryList();
    try {
      const countryCodes = getCountries() || [];
      this.getCountryCallingCodes = countryCodes.map((code: string) => ({
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
            this.isLoading.set(false);
          }))
          .subscribe({
            next: (dataUser) => {
              if (dataUser) {
                
                const userType = dataUser.type ?? dataUser.account?.type;
                this.currentRole = userType ?? '';
                this.currentUser.set(dataUser);
                this.imageUrl = dataUser.profile?.avatar ?? dataUser.profileImage ?? '';           
                this.updateFormWithUserData(dataUser);
                
              } else {
                console.error('No user data found');
                this.errorMessage = 'No user data found. Please try logging in again.';
                
              }
            },
            error: (error) => {
              console.error('Error fetching user data:', error);
              this.errorMessage = 'Failed to load user data. Please try again later.';
              
            }
          });
        this.subscriptions.push(userSubscription);
      } else {
        this.isLoading.set(false);
        this.errorMessage = 'Please log in to view your profile';
        
      }
    });

    this.subscriptions.push(new Subscription(() => unsubscribe()));

    this.loadFollowedOrganizers();
  }

  private updateFormWithUserData(user: User): void {
    const dobValue = user.profile?.dob ?? user.timestamps?.createdAt ?? user.dateOfBirth;
    let formattedDOB = '';
    if (dobValue) {
      try {
        if (typeof dobValue === 'object' && 'toDate' in dobValue && typeof dobValue.toDate === 'function') {
          formattedDOB = dobValue.toDate().toISOString().split('T')[0];
        }
        else if (dobValue instanceof Date) {
          formattedDOB = dobValue.toISOString().split('T')[0];
        }
        else if (typeof dobValue === 'string') {
          formattedDOB = new Date(dobValue).toISOString().split('T')[0];
        }
      } catch (error) {
        console.error('Error formatting date:', error);
      }
    }
    
    // Get organization from nested structure or legacy field
    let organization: Organizer['organization'] | undefined;
    if(this.isOrangizer(user)){
      organization = user.organization || {};
    }
    
    // Get address from nested contact or legacy field
    const address = user.contact?.address ?? user.address ?? {};
    
    // Get user data from nested structure or legacy fields
    const firstName = user.profile?.firstName ?? user.firstName ?? '';
    const lastName = user.profile?.lastName ?? user.lastName ?? '';
    const phoneNumber = user.contact?.phone ?? user.phoneNumber ?? '';
    const email = user.account?.email ?? user.email ?? '';
    const profileImage = user.profile?.avatar ?? user.profileImage ?? '';
    
    Object.keys(this.userForm.controls).forEach(key => {
      try {
        switch (key) {
          case 'firstName':
            this.userForm.get(key)?.setValue(firstName);
            break;
          case 'lastName':
            this.userForm.get(key)?.setValue(lastName);
            break;
          case 'phoneNumber':
            this.userForm.get(key)?.setValue(phoneNumber);
            break;
          case 'email':
            this.userForm.get(key)?.setValue(email);
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
            this.userForm.get(key)?.setValue(profileImage);
            break;
          case 'password':
            this.userForm.get(key)?.setValue('');  
            break;   
        }
      } catch (error) {
        console.error(`Error setting value for ${key}:`, error);
      }
    });
    Object.keys(this.OrganizerForm.controls).forEach(key => {
      try {
        switch (key) {
          case 'companyName'  :
            this.OrganizerForm.get(key)?.setValue(organization?.companyName || '');
            break;
          case 'identifier'  :
            this.OrganizerForm.get(key)?.setValue(organization?.identifier || '');
            break;
          case 'jobTitle'  :
            this.OrganizerForm.get(key)?.setValue(organization?.jobTitle || '');
            break;
          case 'postalCode'  :
            this.OrganizerForm.get(key)?.setValue(organization?.postalCode || '');
            break;      
        }
      } catch (error) {
        console.error(`Error setting value for ${key}:`, error);
      }
    });
    
  }

  isOrangizer(user: User): user is Organizer {
    const userType = user.type ?? user.account?.type;
    return userType === 'organizer';
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getCountryList(): { code: string; name: string }[] {
    try {
      const countryObj = countries.getNames('en', { select: 'official' }) || {};
      return Object.entries(countryObj).map(([code, name]) => ({
        code,
        name,
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

    this.isLoading.set(true);
    this.errorMessage = '';

    this.cloudinaryService.upLoadImage(file).subscribe({
      next: (response: unknown) => {
        const responseData = response as CloudinaryResponse;
        this.imageUrl = responseData.secure_url;
        this.userForm.patchValue({ profileImage: responseData.secure_url });
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        console.error('Error uploading image:', error);
        this.errorMessage = 'Failed to upload image. Please try again.';
        this.isLoading.set(false);
      }
    });
  }

  calculateAge(birthDate: Date): number {
    const currentDate = new Date();
    let age = currentDate.getFullYear() - birthDate.getFullYear();
    const month = currentDate.getMonth() - birthDate.getMonth();
  
    
    if (month < 0 || (month === 0 && currentDate.getDate() < birthDate.getDate())) {
      age--;
    }
  
    return age;
  }
  
  
  getTrimmedString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }
  
  // Hàm kiểm tra và chuyển đổi ngày sinh
  convertDOB(dobValue: unknown): Timestamp | null {
    try {
      const convertedDOB = new Date(dobValue as string);
      if (!isNaN(convertedDOB.getTime())) {
        return Timestamp.fromDate(convertedDOB);
      }
    } catch (error) {
      console.error('Error converting date:', error);
    }
    return null;
  }

  private getLocationName(controlName: string): string {
    const controlValue = this.userForm.get(controlName)?.value as NamedLocationValue;
    if (!controlValue) {
      return '';
    }
    if (typeof controlValue === 'string') {
      return this.getTrimmedString(controlValue);
    }
    if (typeof controlValue === 'object' && 'name' in controlValue) {
      return this.getTrimmedString(controlValue.name);
    }
    return '';
  }
  
  onSubmit(): void {
    if (this.userForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly';
      return;
    }
  
    if (!this.currentUser()?.id) {
      this.errorMessage = 'No user data available';
      return;
    }
  
    this.isSaving.set(true);
    this.errorMessage = '';
    this.successMessage = '';
  
    const dobValue = this.userForm.get('dateOfBirth')?.value;
    let updatedDOB;
    let age;
  
    if (dobValue) {
      const birthDate = new Date(dobValue);
      age = this.calculateAge(birthDate);
      updatedDOB = this.convertDOB(dobValue);
  
      if (!updatedDOB) {
        this.errorMessage = 'Invalid date format';
        this.isSaving.set(false);
        return;
      }
  
    } else {
      this.errorMessage = 'Invalid date format';
      this.isSaving.set(false);
      return;
    }
  
    // Lấy giá trị từ form và trim
    const wards = this.getLocationName('wards');
    const districts = this.getLocationName('districts');
    const city = this.getLocationName('city');
    const firstName = this.getTrimmedString(this.userForm.get('firstName')?.value);
    const lastName = this.getTrimmedString(this.userForm.get('lastName')?.value);
  
    const currentUserData = this.currentUser();
    const existingAccount = currentUserData?.account ?? {};
    const existingProfile = currentUserData?.profile ?? {};
    const existingContact = currentUserData?.contact ?? {};
    const existingOrganization = currentUserData?.organization ?? {};
    
    const updatedUser: Partial<User> = {
      // Nested structure
      account: {
        ...existingAccount,
        email: this.userForm.get('email')?.value ?? existingAccount.email
      },
      profile: {
        ...existingProfile,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        age,
        avatar: this.userForm.get('profileImage')?.value ?? existingProfile.avatar,
        dob: updatedDOB
      },
      contact: {
        ...existingContact,
        phone: this.getTrimmedString(this.userForm.get('phoneNumber')?.value) ?? existingContact.phone,
        address: {
          ...existingContact.address,
          details_address: this.getTrimmedString(this.userForm.get('details_address')?.value),
          wards,
          districts,
          city,
          country: this.getTrimmedString(this.userForm.get('country')?.value)
        }
      },
      organization: currentUserData?.type === 'organizer' ? existingOrganization : null,
      // Legacy fields for backward compatibility
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      age,
      phoneNumber: this.getTrimmedString(this.userForm.get('phoneNumber')?.value),
      address: {
        details_address: this.getTrimmedString(this.userForm.get('details_address')?.value),
        wards,
        districts,
        city,
        country: this.getTrimmedString(this.userForm.get('country')?.value)
      },
      profileImage: this.userForm.get('profileImage')?.value,
      email: this.userForm.get('email')?.value,
      dateOfBirth: updatedDOB
    };
  
    this.userService.updateUserProfile(String(this.currentUser()?.id || ''), updatedUser)
      .pipe(finalize(() => {
        this.isSaving.set(false);
        
      }))
      .subscribe({
        next: () => {
          this.successMessage = 'Profile updated successfully';
          setTimeout(() => {
            this.successMessage = '';
            
          }, 3000);
        },
        error: (error) => {
          console.error('Error updating user:', error);
          this.errorMessage = 'Failed to update profile. Please try again.';
          
        }
      });
  }
  
  activeOrganizer(){
    const authInstance = getAuth();
    const user = authInstance.currentUser;
    let updateOrganizer: Partial<Organizer> = {};

    this.isSaving.set(true);
    this.errorMessage = '';
    this.successMessage = '';

    if (!user) {
      this.errorMessage = 'User not authenticated';
      this.isSaving.set(false);
      return;
    }

    if (!this.currentUser()?.id) {
      this.errorMessage = 'User ID not found';
      this.isSaving.set(false);
      return;
    }

    if(this.activeOF === true) {
      const companyName = this.OrganizerForm.get('companyName')?.value;
      const identifier = this.OrganizerForm.get('identifier')?.value;
      const jobTitle = this.OrganizerForm.get('jobTitle')?.value;
      const postalCode = this.OrganizerForm.get('postalCode')?.value;

      if (!companyName || !identifier || !jobTitle || !postalCode) {
        this.errorMessage = 'Please fill in all organization details';
        this.isSaving.set(false);
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

    this.userService.activeOrganizer(String(this.currentUser()?.id || ''), updateOrganizer)
      .pipe(finalize(() => {
        this.isSaving.set(false);
        
      }))
      .subscribe({
        next: () => {
          this.successMessage = "Organizer activated successfully";
          setTimeout(() => {
            this.successMessage = '';
            
          }, 3000);
        },
        error: (error) => {
          console.error('Error activating organizer:', error);
          this.errorMessage = "Failed to activate organizer. Please try again.";
          
        }
      });
  }

 
  onChangeType(): void {
    this.activeOF = !this.activeOF;
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
  
    const currentPassword = this.changePasswordForm.get('password')?.value;
    const newPassword = this.changePasswordForm.get('NewPassword')?.value;
  
    if (!currentPassword || !newPassword) {
      this.errorMessage = 'Please fill in both current and new password';
      return;
    }
  
    this.isSaving.set(true);
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
    } catch (error) {
      console.error('Failed to update password wrong current password');
      this.errorMessage = 'Failed to update password, wrong current password';
    } finally {
        this.isSaving.set(false);
    }
  }
  

  get firstName() { return this.userForm.get('firstName'); }
  get lastName() { return this.userForm.get('lastName'); }
  get phoneNumber() { return this.userForm.get('phoneNumber'); }
  get details_address() { return this.userForm.get('details_address')}
  get wards() { return this.userForm.get('wards')} 
  get districts() { return this.userForm.get('districts'); }
  get country() { return this.userForm.get('country'); }
  get city() { return this.userForm.get('city'); }
  get email() {return this.userForm.get('email');}
  get dateOfBirth() {return this.userForm.get('dateOfBirth');}
  get password() {return this.changePasswordForm.get('password');}
  get NewPassword() {return this.changePasswordForm.get('NewPassword')}
  get companyName() {return this.OrganizerForm.get('companyName');}
  get identifier() {return this.OrganizerForm.get('identifier');}
  get jobTitle() {return this.OrganizerForm.get('jobTitle');}
  get postalCode() {return this.OrganizerForm.get('postalCode')}

  private loadFollowedOrganizers() {
    if (this.currentUser()?.type === 'member') {
      const sub = this.userService.getFollowedOrganizers(this.currentUser()?.id || '').subscribe({
        next: async (follows: Follows[]) => {
          // Load organizer information for each follow
          const followsWithOrganizers = await Promise.all(
            follows.map(async (follow: Follows) => {
              if (!follow.organizer_id) {
                return follow;
              }
              const organizer = await this.userService
                .getCurrentUserById(String(follow.organizer_id))
                .toPromise();
              return {
                ...follow,
                organizer,
              } as FollowWithOrganizer;
            }),
          );
          this.followedOrganizers = followsWithOrganizers;
          
        },
        error: (error: Error) => {
          console.error('Error loading followed organizers:', error);
          this.errorMessage = 'Failed to load followed organizers';
          
        }
      });
      this.subscriptions.push(sub);
    }
  }

  unfollowOrganizer(followId: string | undefined) {
    if (!followId) return;

    this.isLoading.set(true);
    this.errorMessage = '';
    this.successMessage = '';

    const sub = this.userService.unfollowOrganizer(followId).subscribe({
      next: () => {
        this.followedOrganizers = this.followedOrganizers.filter(f => f.id !== followId);
        this.successMessage = 'Successfully unfollowed organizer';
        this.isLoading.set(false);
        
      },
      error: (error: Error) => {
        console.error('Error unfollowing organizer:', error);
        this.errorMessage = 'Failed to unfollow organizer';
        this.isLoading.set(false);
        
      }
    });
    this.subscriptions.push(sub);
  }
}  