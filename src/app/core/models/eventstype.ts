import { Timestamp } from "firebase/firestore";

export type TimestampLike =
  | Timestamp
  | Date
  | {
      _seconds?: number;
      _nanoseconds?: number;
      seconds?: number;
      nanoseconds?: number;
      toDate?: () => Date;
    }
  | string
  | null;

export interface NamedLocationValue {
  code?: string;
  name?: string;
  coordinates?: CoordinateValue | null;
  [key: string]: unknown;
}

export interface CoordinateValue {
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  [key: string]: unknown;
}

export interface LegacyDateTimeOption {
  start_time: string;
  end_time: string;
  time_zone?: string | null;
  [key: string]: unknown;
}

export interface EventCore {
  id?: string;
  name?: string;
  shortDescription?: string | null;
  description?: string | null;
  content?: string | null;
  category?: string[];
  tags?: string[];
  eventType?: "online" | "offline" | "hybrid" | string | null;
  price?: number | null;
}

export interface EventStatus {
  visibility?: "public" | "private" | "unlisted" | string | null;
  featured?: boolean;
  state?: "draft" | "published" | "cancelled" | "completed" | string | null;
  deletedAt?: TimestampLike;
  [key: string]: unknown;
}

export interface EventMedia {
  coverImage?: string | null;
  primaryImage?: string | null;
  gallery?: string[];
  image_url?: string | null;
  [key: string]: unknown;
}

export interface EventSchedule {
  startDate?: TimestampLike;
  endDate?: TimestampLike;
  dateTimeOptions?: Array<Record<string, unknown>>;
  timezone?: string | null;
  date_time_options?: LegacyDateTimeOption[];
}

export interface EventLocation {
  type: "online" | "offline" | "hybrid" | string;
  address?: string | null;
  details_address?: string | null;
  city?: NamedLocationValue | null;
  district?: NamedLocationValue | null;
  districts?: NamedLocationValue | null;
  ward?: NamedLocationValue | null;
  wards?: NamedLocationValue | null;
  country?: NamedLocationValue | null;
  coordinates?: CoordinateValue | null;
  onlineUrl?: string | null;
  meetingId?: string | null;
  meetingPassword?: string | null;
}

export interface EventOrganizer {
  id?: string | number | null;
  name?: string | null;
  fullName?: string | null;
  followers?: number | null;
  profileImage?: string | null;
  logo?: string | null;
  organization?: {
    companyName?: string;
    identifierCode?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface EventTicketDefinition {
  id?: string;
  name?: string;
  description?: string | null;
  price?: number | null;
  quantity?: number | null;
  quantityAvailable?: number | null;
  maxPerOrder?: number | null;
  saleStartDate?: TimestampLike;
  saleEndDate?: TimestampLike;
  type?: string | null;
  status?: string | null;
  [key: string]: unknown;
}

export interface EventTicketsBlock {
  catalog?: EventTicketDefinition[];
  capacity?: number | null;
  maxAttendees?: number | null;
}

export interface EventEngagement {
  attendeesCount?: number | null;
  likesCount?: number | null;
  viewCount?: number | null;
  searchTerms?: string[];
}

export interface EventTimeline {
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
  created_at?: TimestampLike;
  updated_at?: TimestampLike;
}

export interface EventMetadata {
  [key: string]: unknown;
}

export interface EventList {
  id?: string;
  isLiked?: boolean;
  core?: EventCore;
  status?: EventStatus | string;
  media?: EventMedia;
  schedule?: EventSchedule;
  location: EventLocation;
  organizer?: EventOrganizer | null;
  tickets?: EventTicketsBlock;
  engagement?: EventEngagement;
  metadata?: EventMetadata;
  timeline?: EventTimeline;
  // Legacy flat fields
  name: string;
  description: string;
  content: string;
  date_time_options: LegacyDateTimeOption[];
  event_type: "online" | "offline" | "hybrid" | string;
  price?: number | null;
  currency?: string | null;
  discount?: number | null;
  tags?: string[];
  ticket_link?: string | null;
  max_attendees?: number | null;
  attendees_count?: number | null;
  image_url: string;
  likes_count?: number | null;
  created_at: TimestampLike;
  updated_at: TimestampLike;
}