/* eslint-disable @typescript-eslint/no-explicit-any */
import { DestroyRef, Injectable, inject, signal } from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import { Firestore, collection, doc, getDoc, getDocs, onSnapshot, updateDoc } from "@angular/fire/firestore";
import { Timestamp, addDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Observable, from, map, switchMap } from "rxjs";
import { db } from '../config/firebase.config';
import { Follows } from '../models/followtype';
import { User } from '../models/userstype';

@Injectable({
    providedIn: 'root'
})

export class UsersService{
    private firestore = inject(Firestore);

    private readonly destroyRef = inject(DestroyRef);
    private readonly usersSignal = signal<User[]>([]);
    users$ = toObservable(this.usersSignal.asReadonly());
    private usersUnsubscribe?: () => void;

    constructor() {
        this.fetchUsers();
        this.destroyRef.onDestroy(() => this.usersUnsubscribe?.());
    }

    private fetchUsers() {
        const usersCollection = collection(this.firestore, 'users');
        this.usersUnsubscribe?.();
        this.usersUnsubscribe = onSnapshot(usersCollection, (snapshot) => {
            const users = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as User[];
            this.usersSignal.set(users);
        });
    }

    getCurrentUserById(userId: string): Observable<User | undefined> {
        console.log("getCurrentUserById: " + userId);
        const userDoc = doc(this.firestore, 'users', userId);
        return from(getDoc(userDoc)).pipe(
            map(doc => {
                if (!doc.exists()) {
                    console.log("doc not found");
                    return undefined;
                }
                return { id: doc.id, ...doc.data() } as User;
            })
        );
    }

    updateUserProfile(userId: string, userData: Partial<User>): Observable<void> {
        const userDoc = doc(this.firestore, 'users', userId);
        const payload = this.buildUserUpdatePayload(userData);
        payload['timestamps.updatedAt'] = Timestamp.now();
        return from(updateDoc(userDoc, payload as { [x: string]: any }));
    }

    updateUserLocation(userId: string, location: { latitude: number; longitude: number; timestamp: number }): Observable<void> {
        const userDoc = doc(this.firestore, 'users', userId);
        return from(updateDoc(userDoc, {
            'contact.currentLocation': location,
            'timestamps.updatedAt': Timestamp.now()
        }));
    }

    activeOrganizer(userId: string, organizerData: Partial<User>): Observable<void> {
        const userDoc = doc(this.firestore, 'users', userId);
        const payload = this.buildUserUpdatePayload(organizerData);
        payload['timestamps.updatedAt'] = Timestamp.now();
        return from(updateDoc(userDoc, payload as { [x: string]: any }));
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
            where('userId', '==', userId),
            where('relationship.status', '==', 'active')
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
                            const organizerId = data['organizerId'];
                            
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
                            if ((organizerData as { account?: { type?: string }; type?: string })?.account?.type !== 'organizer' && (organizerData as { account?: { type?: string }; type?: string })?.type !== 'organizer') {
                                console.warn(`User ${organizerId} is not an organizer`);
                                continue;
                            }

                            const orgData = (organizerData as { organization?: { companyName?: string } }).organization;
                            let companyName = 'No company name';
                            if (orgData && typeof orgData.companyName === 'string') {
                                companyName = orgData.companyName;
                            } else {
                                console.warn('companyName is not a string:', orgData?.companyName, 'for organizerId:', organizerId);
                            }

                            const follow: Follows = {
                                id: docSnapshot.id,
                                userId: data['userId'] ?? null,
                                organizerId: organizerId,
                                relationship: {
                                    status: data['relationship']?.status ?? 'active'
                                },
                                metadata: data['metadata'] ?? {},
                                timestamps: {
                                    followedAt: data['timestamps']?.followedAt ?? null,
                                    updatedAt: data['timestamps']?.updatedAt ?? null
                                },
                                organizer: {
                                    id: organizerId,
                                    fullName: (organizerData as { profile?: { fullName?: string } })?.profile?.fullName || '',
                                    profileImage: (organizerData as { profile?: { avatar?: string } })?.profile?.avatar || '',
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
            userId,
            organizerId,
            relationship: { status: 'active' as const },
            metadata: {},
            timestamps: {
                followedAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            }
        };
        return from(addDoc(collection(db, 'follows'), followData).then(() => {}));
    }

    private buildUserUpdatePayload(userData: Partial<User>): Record<string, any> {
        const payload: Record<string, any> = {};
        if (userData.account) {
            payload['account'] = { ...userData.account };
        }
        if (userData.profile) {
            payload['profile'] = { ...userData.profile };
        }
        if (userData.contact) {
            payload['contact'] = { ...userData.contact };
        }
        if (userData.organization !== undefined) {
            payload['organization'] = userData.organization;
        }
        if (userData.security) {
            payload['security'] = { ...userData.security };
        }
        if (userData.social) {
            payload['social'] = { ...userData.social };
        }
        if (userData.metadata) {
            payload['metadata'] = userData.metadata;
        }
        return payload;
    }
}