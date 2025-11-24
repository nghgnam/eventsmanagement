import { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "user";
export type UserType = "member" | "organizer";

export interface BaseUser {
  id: string;
  firstName: string;
  lastName: string
  fullName: string;
  username: string;
  password?: string;
  age: number;
  dateOfBirth: Timestamp;
  address: {
    details_address: string
    wards: string;
    districts: string;
    city: string;
    country: string;
  };
  email: string;
  phoneNumber: string;
  profileImage?: string; 
  role: UserRole;
  type: UserType;
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Organizer extends BaseUser {
  type: "organizer";
  organization: {
    companyName: string;
    identifier: string;
    jobTitle: string;
    postalCode: string;
  };
}

export interface Member extends BaseUser {
  type: "member";
}

export interface Admin extends BaseUser {
  role: "admin";
}

export type User = Admin | Member | Organizer;
