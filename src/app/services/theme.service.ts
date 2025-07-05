import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private readonly THEME_KEY = 'app-theme';
  
  // Signal to track current theme
  public currentTheme = signal<Theme>('light');
  
  // Signal to track if dark mode is active
  public isDarkMode = signal<boolean>(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeTheme();
      this.setupSystemThemeListener();
    }

    // Effect to update DOM when theme changes
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.applyTheme(this.currentTheme());
      }
    });
  }

  private initializeTheme(): void {
    // Check if user has a saved preference
    const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme;
    
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      this.setTheme(savedTheme);
    } else {
      // Use system preference
      this.setTheme(this.getSystemTheme());
    }
  }

  private getSystemTheme(): Theme {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  private setupSystemThemeListener(): void {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Listen for system theme changes
      mediaQuery.addEventListener('change', (e) => {
        // Only update if user hasn't set a manual preference
        const savedTheme = localStorage.getItem(this.THEME_KEY);
        if (!savedTheme) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light-theme', 'dark-theme');
    
    // Add new theme class
    root.classList.add(`${theme}-theme`);
    
    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(theme);
  }

  private updateMetaThemeColor(theme: Theme): void {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const color = theme === 'dark' ? '#000000' : '#ffffff';
      metaThemeColor.setAttribute('content', color);
    }
  }

  public setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    this.isDarkMode.set(theme === 'dark');
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.THEME_KEY, theme);
    }
  }

  public toggleTheme(): void {
    const newTheme = this.currentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  public setSystemTheme(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Remove saved preference to follow system
      localStorage.removeItem(this.THEME_KEY);
      this.setTheme(this.getSystemTheme());
    }
  }

  public isSystemTheme(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return !localStorage.getItem(this.THEME_KEY);
    }
    return true;
  }
}
