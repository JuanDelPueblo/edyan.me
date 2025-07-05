import { Component, OnInit } from '@angular/core';
import { Card } from '../../components/card/card';
import { ContactsGrid } from "../../components/contacts_grid/contacts_grid";
import { STRINGS } from '../../strings';

@Component({
  selector: 'hero',
  imports: [
    Card,
    ContactsGrid
  ],
  templateUrl: './hero.html',
  styleUrl: './hero.scss'
})
export class Hero {
  readonly aboutMeStrings = STRINGS.aboutMe;
}
