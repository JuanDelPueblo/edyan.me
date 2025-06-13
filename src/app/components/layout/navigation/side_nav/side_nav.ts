import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Card } from '../../../shared/card/card';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'side-nav',
  imports: [RouterLink, RouterLinkActive, MatIconModule, Card],
  templateUrl: './side_nav.html',
  styleUrl: './side_nav.scss'
})
export class SideNav {
  navItems: NavItem[] = [
    { path: '/', label: 'Home', icon: 'home', exact: true },
    { path: '/about', label: 'About Me', icon: 'person' },
    { path: '/projects', label: 'Projects', icon: 'work' },
    { path: '/experiences', label: 'Experiences', icon: 'business' },
    { path: '/contact', label: 'Contact', icon: 'contact_mail' }
  ];
}
