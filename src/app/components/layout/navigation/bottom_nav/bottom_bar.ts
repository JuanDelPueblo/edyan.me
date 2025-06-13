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
  selector: 'bottom-bar',
  imports: [RouterLink, RouterLinkActive, MatIconModule, Card],
  templateUrl: './bottom_bar.html',
  styleUrl: './bottom_bar.scss'
})
export class BottomBar {
  navItems: NavItem[] = [
    { path: '/', label: 'Home', icon: 'home', exact: true },
    { path: '/about', label: 'About', icon: 'person' },
    { path: '/projects', label: 'Projects', icon: 'work' },
    { path: '/experiences', label: 'Experience', icon: 'business' },
    { path: '/contact', label: 'Contact', icon: 'contact_mail' }
  ];
}
