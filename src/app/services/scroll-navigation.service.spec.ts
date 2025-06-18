import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ScrollNavigationService } from './scroll-navigation.service';

describe('ScrollNavigationService', () => {
  let service: ScrollNavigationService;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate'], {
      url: '/'
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    });
    
    service = TestBed.inject(ScrollNavigationService);
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should navigate to next page when scrolling down at bottom', () => {
    // Mock being at bottom of page
    Object.defineProperty(window, 'scrollY', { value: 1000, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1800, writable: true });
    
    Object.defineProperty(mockRouter, 'url', { value: '/', writable: true });
    
    const wheelEvent = new WheelEvent('wheel', { deltaY: 100 });
    service.handleScroll(wheelEvent);
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/projects']);
  });

  it('should navigate to previous page when scrolling up at top', () => {
    // Mock being at top of page
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
    
    Object.defineProperty(mockRouter, 'url', { value: '/projects', writable: true });
    
    const wheelEvent = new WheelEvent('wheel', { deltaY: -100 });
    service.handleScroll(wheelEvent);
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });
});
