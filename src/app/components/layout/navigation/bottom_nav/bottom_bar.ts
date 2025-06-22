import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Card } from '../../../shared/card/card';

interface NavItem {
  sectionId: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'bottom-bar',
  imports: [MatIconModule, Card],
  templateUrl: './bottom_bar.html',
  styleUrl: './bottom_bar.scss'
})
export class BottomBar {
  navItems: NavItem[] = [
    { sectionId: 'hero', label: 'Home', icon: 'home' },
    { sectionId: 'projects', label: 'Projects', icon: 'work' },
    { sectionId: 'experiences', label: 'Experience', icon: 'business' },
    { sectionId: 'contact', label: 'Contact', icon: 'contact_mail' }
  ];

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
