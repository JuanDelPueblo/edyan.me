import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { Contact } from '../../../datatypes';

@Component({
  selector: 'contact-item',
  imports: [MatIcon],
  templateUrl: './contact_item.html',
  styleUrl: './contact_item.scss'
})
export class ContactItem {
  readonly contact = input.required<Contact>();
}
