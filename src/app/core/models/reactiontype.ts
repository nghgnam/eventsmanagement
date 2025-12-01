import { TimestampLike } from "./eventstype";

export interface ReactionTarget {
  eventId: string | null;
  type: "event" | "comment" | string;
}

export interface Reaction {
  id?: string;
  userId: string | null;
  target: ReactionTarget;
  status: "active" | "inactive" | string;
  metadata: {
    reaction: string;
    [key: string]: unknown;
  };
  timestamps: {
    likedAt: TimestampLike;
    updatedAt: TimestampLike;
  };
}

