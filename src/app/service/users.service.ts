import { Injectable } from "@angular/core";
import { Firestore, collection, doc, getDoc, getDocs, onSnapshot, updateDoc, arrayUnion, arrayRemove } from "@angular/fire/firestore";
import { BehaviorSubject, Observable, from, map } from "rxjs";
import { User } from "../types/userstype";

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


}