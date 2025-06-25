import { Component } from '@angular/core';
import { UnifiedNav } from './components/unified_nav/unified_nav';
import { Hero } from './pages/hero/hero';
import { Projects } from './pages/projects/projects';
import { Experiences } from './pages/experiences/experiences';
import { NavItem } from './types/datatypes';

@Component({
  selector: 'root',
  imports: [UnifiedNav, Hero, Projects, Experiences],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'edyan.me';

  protected navItems: NavItem[] = [
    { sectionId: 'hero', label: 'Home', icon: 'home' },
    { sectionId: 'projects', label: 'Projects', icon: 'code' },
    { sectionId: 'experiences', label: 'Experiences', icon: 'work' },
  ];
}
