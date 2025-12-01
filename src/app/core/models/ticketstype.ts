import { TimestampLike } from "./eventstype";

export interface TicketPricing {
  total?: number | null;
  currency?: string | null;
  paid?: boolean;
}

export interface TicketLifecycle {
  createdAt?: TimestampLike;
  expireAt?: TimestampLike;
  usedAt?: TimestampLike | null;
  canceledAt?: TimestampLike | null;
}

export interface TicketMetadata {
  paymentMethod?: string | null;
  notes?: string | null;
  [key: string]: unknown;
}

export interface TicketType {
  id?: string;
  userId?: string | null;
  eventId?: string | null;
  user_id?: string | null;
  event_id?: string | null;
  status?: "active" | "unused" | "used" | "canceled" | "expired" | string;
  pricing?: TicketPricing;
  lifecycle?: TicketLifecycle;
  metadata?: TicketMetadata;
  total_price?: number | null;
  paid?: boolean;
  create_at?: TimestampLike | Date;
  used_at?: TimestampLike | Date | null;
  expire_at?: TimestampLike | Date;
}