import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Card } from '../../../shared/card/card';

@Component({
  selector: 'bottom-bar',
  imports: [RouterLink, RouterLinkActive, Card],
  templateUrl: './bottom_bar.html',
  styleUrl: './bottom_bar.scss'
})
export class BottomBar {

}
