import { Component, inject } from '@angular/core';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'theme-toggle',
  imports: [],
  template: `
    <button 
      class="theme-toggle-btn"
      (click)="toggleTheme()"
      [attr.aria-label]="'Switch to ' + (themeService.isDarkMode() ? 'light' : 'dark') + ' theme'"
      title="Toggle theme">
      <span class="material-icons">
        {{ themeService.isDarkMode() ? 'light_mode' : 'dark_mode' }}
      </span>
    </button>
  `,
  styleUrl: './theme_toggle.scss'
})
export class ThemeToggle {
  protected themeService = inject(ThemeService);

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
