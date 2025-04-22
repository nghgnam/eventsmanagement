import { Timestamp } from "firebase/firestore";

export type Subscriptions = {
    user_id: string | undefined;
    event_id: string | undefined;
    status: string;
    start_date: Timestamp;

}