import { inject } from "@angular/core";
import { Auth, user } from "@angular/fire/auth"
import { CanActivateFn, Router } from "@angular/router"
import { take, map } from "rxjs";

/**
 * Admin Guard
 * 
 * Protects admin routes - only users with admin role can access
 * TODO: Integrate with backend to check user role from Firestore
 */
export const adminGuard: CanActivateFn = (route, state) => {
    const auth = inject(Auth);
    const router = inject(Router);

    return user(auth).pipe(
        take(1),
        map((currentUser) => {
            if (!currentUser) {
                return router.createUrlTree(['/login'], {
                    queryParams: { returnUrl: state.url } 
                });
            }

            // TODO: Check if user has admin role from Firestore
            // For now, allow access if user is logged in
            // In production, you should:
            // 1. Get user document from Firestore
            // 2. Check if user.role === 'admin'
            // 3. Return true only if admin, otherwise redirect to home
            
            // Example implementation (commented out):
            // return this.usersService.getUser(currentUser.uid).pipe(
            //   map(user => {
            //     if (user?.role === 'admin') {
            //       return true;
            //     }
            //     return router.createUrlTree(['/home']);
            //   })
            // );

            // Temporary: Allow all authenticated users (remove in production)
            return true;
        }),
    );
}

