import { Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { Contact } from '../../../datatypes';
import { matEmailRound } from '@ng-icons/material-icons/round';
import { faBrandGithub, faBrandDiscord, faBrandLinkedin } from '@ng-icons/font-awesome/brands';

@Component({
  selector: 'contact-item',
  imports: [NgIcon],
  templateUrl: './contact_item.html',
  styleUrl: './contact_item.scss',
  providers: [provideIcons({
    matEmailRound,
    faBrandGithub,
    faBrandDiscord,
    faBrandLinkedin,
  })],
})
export class ContactItem {
  readonly contact = input.required<Contact>();
}
