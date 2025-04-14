import { Timestamp } from "firebase/firestore";
export type EventList = {
    id?: string;
    name: string;
    description: string;
    content: string;
    date_time_options: {
        start_time: string;
        end_time: string;
        time_zone: string;
    }[];
    location: {
        type: 'online' | 'offline';
        address?: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    image_url: string;
    price?: number ;
    currency?: string;
    discount?: number;
    organizer: {
        id: string;
        name: string;
        followers: number;
        profileImage?: string;
    };
    tags?: string[];
    event_type: 'online' | 'offline' | 'hybrid';
    ticket_link?: string;
    max_attendees?: number;
    attendees_count?: number;  
    status?: 'draft' | 'published' | 'cancelled' | 'completed';    
    likes_count?: number;
    created_at: Timestamp;
    updated_at: Timestamp;

};
