import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeToggle } from './theme_toggle';
import { ThemeService } from '../../../services/theme.service';

describe('ThemeToggle', () => {
  let component: ThemeToggle;
  let fixture: ComponentFixture<ThemeToggle>;
  let themeService: jasmine.SpyObj<ThemeService>;

  beforeEach(async () => {
    const themeServiceSpy = jasmine.createSpyObj('ThemeService', ['toggleTheme'], {
      isDarkMode: jasmine.createSpy().and.returnValue(false)
    });

    await TestBed.configureTestingModule({
      imports: [ThemeToggle],
      providers: [
        { provide: ThemeService, useValue: themeServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeToggle);
    component = fixture.componentInstance;
    themeService = TestBed.inject(ThemeService) as jasmine.SpyObj<ThemeService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle theme when button is clicked', () => {
    const button = fixture.nativeElement.querySelector('.theme-toggle-btn');
    button.click();
    
    expect(themeService.toggleTheme).toHaveBeenCalled();
  });
});
