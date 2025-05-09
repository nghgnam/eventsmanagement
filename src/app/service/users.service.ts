import { Injectable } from "@angular/core";
import { Firestore, collection, doc, getDoc, getDocs, onSnapshot, updateDoc, arrayUnion, arrayRemove } from "@angular/fire/firestore";
import { BehaviorSubject, Observable, from, map, switchMap } from "rxjs";
import { User, Organizer } from "../types/userstype";
import { Follows } from '../types/followtype';
import { query, where, addDoc, deleteDoc, DocumentReference } from 'firebase/firestore';
import { db } from '../config/firebase.config';

@Injectable({
    providedIn: 'root'
})

export class UsersService{
    private usersSubject = new BehaviorSubject<User[]>([])
    users$ = this.usersSubject.asObservable();

    constructor(private firestore: Firestore) {
        this.fetchUsers();
    }

    private fetchUsers() {
        const usersCollection = collection(this.firestore, 'users');
        return onSnapshot(usersCollection, (snapshot) => {
            const users = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as User[];
            this.usersSubject.next(users);
        });
    }

    getCurrentUserById(userId: string): Observable<User | undefined> {
        const userDoc = doc(this.firestore, 'users', userId);
        return from(getDoc(userDoc)).pipe(
            map(doc => {
                if (!doc.exists()) {
                    return undefined;
                }
                return { id: doc.id, ...doc.data() } as User;
            })
        );
    }

    updateUserProfile(userId: string, userData: Partial<User>): Observable<void> {
        const userDoc = doc(this.firestore, 'users', userId);
        return from(updateDoc(userDoc, {
            ...userData,
            updatedAt: new Date()
        }));
    }

    updateUserLocation(userId: string, location: { latitude: number; longitude: number; timestamp: number }): Observable<void> {
        const userDoc = doc(this.firestore, 'users', userId);
        return from(updateDoc(userDoc, {
            currentLocation: location,
            updatedAt: new Date()
        }));
    }

    activeOrganizer(userId: string, organizerData: Partial<User>): Observable<void> {
        const userDoc = doc(this.firestore, 'users', userId);
        return from(updateDoc(userDoc, {
            ...organizerData,
            updatedAt: new Date()
        }));
    }

    getFollowedOrganizers(userId: string): Observable<Follows[]> {
        if (!userId) {
            console.error('getFollowedOrganizers: userId is required');
            return new Observable(subscriber => {
                subscriber.next([]);
                subscriber.complete();
            });
        }

        const followsQuery = query(
            collection(db, 'follows'),
            where('user_id', '==', userId),
            where('status', '==', 'active')
        );

        return from(getDocs(followsQuery)).pipe(
            switchMap(async snapshot => {
                try {
                    const follows: Follows[] = [];
                    
                    // Validate snapshot
                    if (snapshot.empty) {
                        console.log('No follows found for user:', userId);
                        return follows;
                    }

                    // Process each follow document
                    for (const docSnapshot of snapshot.docs) {
                        try {
                            const data = docSnapshot.data();
                            const organizerId = data['organizer_id'];
                            
                            if (!organizerId) {
                                console.warn('Follow document missing organizer_id:', docSnapshot.id);
                                continue;
                            }

                            // Get organizer data
                            const organizerDoc = await getDoc(doc(db, 'users', organizerId));
                            if (!organizerDoc.exists()) {
                                console.warn(`No organizer found for ID: ${organizerId}`);
                                continue;
                            }

                            const organizerData = organizerDoc.data() as User;
                            if (organizerData.type !== 'organizer') {
                                console.warn(`User ${organizerId} is not an organizer`);
                                continue;
                            }

                            const orgData = (organizerData as any).organization;
                            let companyName = 'No company name';
                            if (orgData && typeof orgData.companyName === 'string') {
                                companyName = orgData.companyName;
                            } else {
                                console.warn('companyName is not a string:', orgData?.companyName, 'for organizerId:', organizerId);
                            }

                            const follow: Follows = {
                                id: docSnapshot.id,
                                user_id: data['user_id'],
                                organizer_id: organizerId,
                                status: data['status'],
                                follow_date: data['follow_date']?.toDate(),
                                organizer: {
                                    id: organizerId,
                                    fullName: organizerData.fullName || '',
                                    profileImage: organizerData.profileImage || '',
                                    organization: {
                                        companyName: companyName
                                    }
                                }
                            };
                            follows.push(follow);
                        } catch (error) {
                            console.error('Error processing follow document:', error);
                        }
                    }

                    return follows;
                } catch (error) {
                    console.error('Error in getFollowedOrganizers:', error);
                    throw error;
                }
            })
        );
    }

    unfollowOrganizer(followId: string): Observable<void> {
        const followDoc = doc(db, 'follows', followId);
        return from(deleteDoc(followDoc));
    }

    followOrganizer(userId: string, organizerId: string): Observable<void> {
        const followData = {
            user_id: userId,
            organizer_id: organizerId,
            status: 'active' as const,
            follow_date: new Date()
        };
        return from(addDoc(collection(db, 'follows'), followData).then(() => {}));
    }
}