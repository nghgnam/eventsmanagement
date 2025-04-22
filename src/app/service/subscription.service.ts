import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, of , from} from "rxjs";
import { EventList } from "../types/eventstype";
import { auth, db } from "../config/firebase.config";
import { collection, getDocs, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { doc, getDoc } from "firebase/firestore";
import { map } from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
    
}