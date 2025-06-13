import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Card } from '../../../shared/card/card';

@Component({
  selector: 'side-nav',
  imports: [RouterLink, RouterLinkActive, Card],
  templateUrl: './side_nav.html',
  styleUrl: './side_nav.scss'
})
export class SideNav {

}
