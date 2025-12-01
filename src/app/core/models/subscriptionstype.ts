import { TimestampLike } from "./eventstype";

export interface SubscriptionBillingBlock {
  price?: number | null;
  currency?: string | null;
  plan?: string | null;
}

export interface SubscriptionPeriodBlock {
  start?: TimestampLike;
  end?: TimestampLike;
}

export interface Subscriptions {
  id?: string;
  userId?: string | null;
  eventId?: string | null;
  user_id?: string | null;
  event_id?: string | null;
  status?: "active" | "inactive" | "canceled" | string;
  billing?: SubscriptionBillingBlock;
  period?: SubscriptionPeriodBlock;
  price?: number | null;
  metadata?: Record<string, unknown>;
  timestamps?: {
    createdAt?: TimestampLike;
    updatedAt?: TimestampLike;
  };
  start_date?: TimestampLike | string | null;
  end_date?: TimestampLike | string | null;
}