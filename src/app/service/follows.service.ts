import { Injectable, inject } from '@angular/core';
import { CollectionReference, Firestore, collection, deleteDoc, doc, getDocs, query, setDoc, where } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';

export interface Follow {
  id?: string;
  followerId: string;
  organizerId: string;
  organizerName: string;
  organizerImage?: string;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class FollowsService{
  private followsCollection: CollectionReference | undefined;
  private firestore = inject(Firestore);


  constructor(){
    if(this.firestore){
      this.followsCollection = collection(this.firestore, 'follows');
    }
  }

  // Get all follows for a user
  getFollowsByUser(userId: string): Observable<Follow[]> {
    if(!this.followsCollection){
      return of([]);
    }
    const q = query(this.followsCollection as CollectionReference, where('followerId', '==', userId));
    return from(getDocs(q).then(snapshot => {
      const follows: Follow[] = [];
      snapshot.forEach(doc => {
        follows.push({
          id: doc.id,
          ...doc.data() as Follow
        });
      });
      return follows;
    }));
  }

  // Follow an organizer
  followOrganizer(follow: Follow): Observable<void> {
    if(!this.followsCollection){
      return of(undefined);
    }
    const followDoc = doc(this.followsCollection as CollectionReference);
    return from(setDoc(followDoc, {
      ...follow,
      createdAt: new Date()
    }));
  }

  // Unfollow an organizer
  unfollowOrganizer(followId: string): Observable<void> {
    if(!this.followsCollection){
      return of(undefined);
    }
    const followDoc = doc(this.followsCollection as CollectionReference, followId);
    return from(deleteDoc(followDoc));
  }

  // Check if user is following an organizer
  isFollowing(followerId: string, organizerId: string): Observable<boolean> {
    const q = query(
      this.followsCollection as CollectionReference,
      where('followerId', '==', followerId),
      where('organizerId', '==', organizerId)
    );
    return from(getDocs(q).then(snapshot => !snapshot.empty));
  }
} 