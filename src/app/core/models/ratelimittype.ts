import { TimestampLike } from "./eventstype";

export interface RateLimitClientBlock {
  ip: string | null;
  userId: string | null;
  userAgent: string | null;
  location: string | null;
}

export interface RateLimitActionBlock {
  name: string | null;
  method: string | null;
  contextKey: string | null;
}

export interface RateLimitCountersBlock {
  count: number;
  max: number | null;
}

export interface RateLimit {
  id?: string;
  client: RateLimitClientBlock;
  action: RateLimitActionBlock;
  counters: RateLimitCountersBlock;
  timestamps: {
    lastRequestAt: TimestampLike;
    expiredAt: TimestampLike;
    createdAt: TimestampLike;
    updatedAt: TimestampLike;
  };
}

