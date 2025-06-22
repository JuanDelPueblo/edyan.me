import { Component } from '@angular/core';
import { SideNav } from './components/layout/navigation/side_nav/side_nav';
import { BottomBar } from './components/layout/navigation/bottom_nav/bottom_bar';
import { Hero } from './pages/hero/hero';
import { Projects } from './pages/projects/projects';
import { Experiences } from './pages/experiences/experiences';
import { Contact } from './pages/contact/contact';

@Component({
  selector: 'root',
  imports: [SideNav, BottomBar, Hero, Projects, Experiences, Contact],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'edyan.me';

}
