export type Follows = {
    id?: string;
    user_id: string;
    organizer_id: string;
    status: 'active' | 'inactive';
    follow_date?: Date;
    organizer?: {
        id: string;
        fullName: string;
        profileImage?: string;
        organization?: {
            companyName: string;
        };
    };
}