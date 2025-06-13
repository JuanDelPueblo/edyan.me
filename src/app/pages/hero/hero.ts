import { Component } from '@angular/core';
import { Card } from '../../components/shared/card/card';

@Component({
  selector: 'hero',
  imports: [
    Card
  ],
  templateUrl: './hero.html',
  styleUrl: './hero.scss'
})
export class Hero {

}
