import { isPlatformBrowser } from "@angular/common";
import {
    Component,
    effect,
    ElementRef,
    inject,
    input,
    model,
    OnDestroy,
    PLATFORM_ID,
    viewChild
} from "@angular/core";
@Component({
    selector: 'app-popup',
    standalone: true,
    templateUrl: './popup.component.html',
    styleUrls: ['./popup.component.css']
})
export class PopupComponent implements OnDestroy {
    title = input<string>('');
    message = input<string>('');
    type = input<string>('success');
    width = input<string>('300px');
    height = input<string>('200px');
    isVisible = model<boolean>();
    containerRef = viewChild<ElementRef<HTMLDivElement>>('popupContainer');

    private platformId = inject(PLATFORM_ID);

    constructor(){
        effect(() => {
            const visible = this.isVisible();
            if(this.platformId && isPlatformBrowser(this.platformId)){
                if(visible){
                    document.body.style.overflow = 'hidden';     
                }
                else {
                    document.body.style.overflow = '';
                }
            }
        })
    }


    closePopupHandler(): void {
        this.isVisible.set(false);
    }

    ngOnDestroy(): void {
        if (isPlatformBrowser(this.platformId)) {
            document.body.style.overflow = '';
        }
    }
}