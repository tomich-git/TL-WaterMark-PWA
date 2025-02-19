import { Component } from '@angular/core';

@Component({
  selector: 'app-foot',
  standalone: true,
  imports: [],
  templateUrl: './foot.component.html',
  styleUrl: './foot.component.css'
})
export class FootComponent {

  openDeveloperWebsite() {
    window.open('https://ticlabs.es', '_blank');
  }
  
}
