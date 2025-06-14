import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideNav } from './components/layout/navigation/side_nav/side_nav';
import { BottomBar } from './components/layout/navigation/bottom_nav/bottom_bar';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'root',
  imports: [RouterOutlet, SideNav, BottomBar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'edyan.me';
  private themeService = inject(ThemeService);
}
