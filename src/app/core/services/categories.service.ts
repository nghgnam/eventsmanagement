import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { isPlatformBrowser } from '@angular/common';
import { from, Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  image?: string | null;
  description?: string | null;
  order?: number | null;
  isActive?: boolean;
  parentId?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriesService {
  private platformId = inject(PLATFORM_ID);
  private firestore = inject(Firestore);
  private cached$?: Observable<Category[]>;

  getCategories(forceRefresh = false): Observable<Category[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return of([]);
    }

    if (!this.cached$ || forceRefresh) {
      const categoriesRef = collection(this.firestore, 'categories');

      this.cached$ = from(getDocs(categoriesRef)).pipe(
        map((snapshot) => {
          console.log('[CategoriesService] Raw categories from Firestore:', snapshot.docs.length);
          const categories = snapshot.docs
            .map((doc) => {
              const data = doc.data() as Omit<Category, 'id'>;
              return {
                id: doc.id,
                name: data.name?.trim() || '',
                slug: data.slug?.trim() || '',
                icon: data.icon ?? null,
                image: data.image ?? null,
                description: data.description ?? null,
                order: data.order ?? null,
                isActive: data.isActive ?? true,
                parentId: data.parentId ?? null
              } as Category;
            })
            .filter((doc) => {
              const isValid = doc.name && doc.slug && doc.isActive !== false;
              if (!isValid) {
                console.warn('[CategoriesService] Filtered out invalid category:', doc);
              }
              return isValid;
            })
            .sort((a, b) => {
              const orderA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
              const orderB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
              if (orderA !== orderB) {
                return orderA - orderB;
              }
              return a.name.localeCompare(b.name);
            });
          console.log('[CategoriesService] Processed categories:', categories.length);
          return categories;
        }),
        catchError((error) => {
          console.error('[CategoriesService] Failed to load categories', error);
          return of([]);
        }),
        shareReplay(1)
      );
    }

    return this.cached$;
  }
}


