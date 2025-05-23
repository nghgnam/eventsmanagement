import { Timestamp } from "firebase/firestore";

export type Subscriptions = {
    user_id: string | undefined;
    event_id: string | undefined;
    status: ('active' | 'inactive' );
    start_date: string | null;
    end_date: string | null;
    price?: number ;
}