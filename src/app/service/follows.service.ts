import { Injectable } from '@angular/core';
import { Firestore, collection, query, where, getDocs, doc, setDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

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
export class FollowsService {
  private followsCollection;

  constructor(private firestore: Firestore) {
    this.followsCollection = collection(this.firestore, 'follows');
  }

  // Get all follows for a user
  getFollowsByUser(userId: string): Observable<Follow[]> {
    const q = query(this.followsCollection, where('followerId', '==', userId));
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
    const followDoc = doc(this.followsCollection);
    return from(setDoc(followDoc, {
      ...follow,
      createdAt: new Date()
    }));
  }

  // Unfollow an organizer
  unfollowOrganizer(followId: string): Observable<void> {
    const followDoc = doc(this.followsCollection, followId);
    return from(deleteDoc(followDoc));
  }

  // Check if user is following an organizer
  isFollowing(followerId: string, organizerId: string): Observable<boolean> {
    const q = query(
      this.followsCollection,
      where('followerId', '==', followerId),
      where('organizerId', '==', organizerId)
    );
    return from(getDocs(q).then(snapshot => !snapshot.empty));
  }
} 