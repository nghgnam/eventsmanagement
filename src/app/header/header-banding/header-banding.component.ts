import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedService } from '../../service/shared.service';
@Component({
  selector: 'app-header-banding',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './header-banding.component.html',
  styleUrls: ['./header-banding.component.css']
})
export class HeaderBandingComponent {
  constructor(private sharedService: SharedService) {}
  onNavigate(): void {
    this.sharedService.hideBodyPage(); // Ẩn BodyPage khi điều hướng
    // Ví dụ: Điều hướng đến trang login
  }
}
