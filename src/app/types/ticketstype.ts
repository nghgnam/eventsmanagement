import { Timestamp } from "firebase/firestore";

export type TicketType = {
    user_id: string;
    event_id: string;
    status: ('active' | 'unused' | 'used' | 'canceled' | 'expired');
    create_at: Timestamp;
    used_at?: Timestamp;
    total_price?: number;
    paid?: boolean;
    expire_at: Timestamp;
}