import { Component, input } from '@angular/core';
import { ContactItem } from './contact_item/contact_item';
import { Contact } from '../../datatypes';

@Component({
  selector: 'contacts-grid',
  imports: [ContactItem],
  templateUrl: './contacts_grid.html',
  styleUrl: './contacts_grid.scss'
})
export class ContactsGrid {
  readonly contacts = input.required<Contact[]>();
}
