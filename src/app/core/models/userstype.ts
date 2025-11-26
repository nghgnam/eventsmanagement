import { TimestampLike } from "./eventstype";

export type UserRole = "admin" | "user" | string;
export type UserType = "member" | "organizer" | string;

export interface UserAccountBlock {
  username?: string | null;
  email?: string | null;
  role?: UserRole | null;
  type?: UserType | null;
  status?: "active" | "inactive" | string | null;
}

export interface UserProfileBlock {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  dob?: TimestampLike;
  age?: number | null;
  gender?: string | null;
}

export interface AddressBlock {
  [key: string]: unknown;
  details_address?: string;
  wards?: string | Record<string, unknown>;
  districts?: string | Record<string, unknown>;
  city?: string | Record<string, unknown>;
  country?: string;
  street?: string;
  postalCode?: string;
}

export interface UserContactBlock {
  phone?: string | null;
  address?: AddressBlock | null;
  currentLocation?: {
    latitude?: number;
    longitude?: number;
    timestamp?: number;
  } | null;
}

export interface OrganizationBlock {
  companyName?: string;
  identifier?: string;
  identifierCode?: string;
  jobTitle?: string;
  postalCode?: string;
  [key: string]: unknown;
}

export interface UserSecurityBlock {
  password?: string | null;
  lastLogin?: TimestampLike;
  blacklist?: unknown;
}

export interface UserSocialBlock {
  followers?: number | null;
  following?: Array<string | number>;
  preferences?: Record<string, unknown>;
}

export interface LegacyUserFields {
  id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  username?: string;
  password?: string;
  age?: number | null;
  dateOfBirth?: TimestampLike | Date | null;
  address?: AddressBlock | null;
  email?: string;
  phoneNumber?: string;
  profileImage?: string;
  role?: UserRole | string | null;
  type?: UserType | string | null;
  currentLocation?: {
    latitude?: number;
    longitude?: number;
    timestamp?: number;
  } | null;
  organization?: OrganizationBlock | null;
  companyName?: string;
  identifierCode?: string;
  currentJob?: string;
  postalCode?: string;
  followers?: number | null;
  createdAt?: TimestampLike | Date | null;
  updatedAt?: TimestampLike | Date | null;
}

export interface User extends LegacyUserFields {
  account?: UserAccountBlock;
  profile?: UserProfileBlock;
  contact?: UserContactBlock;
  organization?: OrganizationBlock | null;
  security?: UserSecurityBlock;
  social?: UserSocialBlock;
  metadata?: Record<string, unknown>;
  timestamps?: {
    createdAt?: TimestampLike;
    updatedAt?: TimestampLike;
  };
}

export interface Organizer extends User {
  type?: "organizer" | string;
  organization?: OrganizationBlock | null;
}

export interface Member extends User {
  type?: "member" | string;
}
