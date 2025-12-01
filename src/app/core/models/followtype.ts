import { TimestampLike } from "./eventstype";

export interface FollowOrganizerSnapshot {
  id: string | number;
  fullName?: string | null;
  profileImage?: string | null;
  organization?: {
    companyName?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface Follows {
  id?: string;
  userId?: string | null;
  organizerId?: string | number | null;
  user_id?: string | null;
  organizer_id?: string | number | null;
  status?: "active" | "inactive" | string;
  relationship?: {
    status: "active" | "inactive" | string;
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
  organizer?: FollowOrganizerSnapshot;
  timestamps?: {
    followedAt?: TimestampLike;
    updatedAt?: TimestampLike;
  };
  follow_date?: TimestampLike | Date | null;
}