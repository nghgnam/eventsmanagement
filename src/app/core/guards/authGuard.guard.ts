import { inject } from "@angular/core";
import { Auth, user } from "@angular/fire/auth"
import { CanActivateFn, Router } from "@angular/router"
import { take, map } from "rxjs";

export const authGuard: CanActivateFn = (route, state) => {
    const auth = inject(Auth);
    const router = inject(Router);

    return user(auth).pipe(
        take(1),
        map((currentUser) => {
            if(currentUser) {
                return true
            }

            return router.createUrlTree(['/login'], {
            queryParams: { returnUrl: state.url } 
            });
        }),
    );
}