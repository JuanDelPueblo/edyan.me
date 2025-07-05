import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
    
    // Mock localStorage
    let store: Record<string, string> = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => store[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => store[key] = value);
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => delete store[key]);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with light theme by default', () => {
    expect(service.currentTheme()).toBe('light');
    expect(service.isDarkMode()).toBe(false);
  });

  it('should toggle theme correctly', () => {
    service.setTheme('light');
    expect(service.currentTheme()).toBe('light');
    
    service.toggleTheme();
    expect(service.currentTheme()).toBe('dark');
    expect(service.isDarkMode()).toBe(true);
    
    service.toggleTheme();
    expect(service.currentTheme()).toBe('light');
    expect(service.isDarkMode()).toBe(false);
  });

  it('should save theme preference to localStorage', () => {
    service.setTheme('dark');
    expect(localStorage.setItem).toHaveBeenCalledWith('app-theme', 'dark');
  });
});
