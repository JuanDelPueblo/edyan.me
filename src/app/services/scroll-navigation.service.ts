import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ScrollNavigationService {
  private router = inject(Router);
  
  private readonly routes = ['', 'projects', 'experiences', 'contact'];
  private lastScrollTime = 0;
  private readonly scrollThrottle = 500; // Minimum time between scroll navigations
  
  /**
   * Handles scroll events to navigate between pages
   * @param event - The wheel event from scrolling
   */
  handleScroll(event: WheelEvent): void {
    const now = Date.now();
    if (now - this.lastScrollTime < this.scrollThrottle) return;
    
    const currentRoute = this.getCurrentRoute();
    const currentIndex = this.routes.indexOf(currentRoute);
    
    if (currentIndex === -1) return;
    
    const isAtTop = window.scrollY === 0;
    const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1;
    
    let targetIndex = -1;
    
    // Scrolling down at bottom of page
    if (event.deltaY > 0 && isAtBottom && currentIndex < this.routes.length - 1) {
      targetIndex = currentIndex + 1;
    }
    // Scrolling up at top of page
    else if (event.deltaY < 0 && isAtTop && currentIndex > 0) {
      targetIndex = currentIndex - 1;
    }
    
    if (targetIndex !== -1) {
      this.lastScrollTime = now;
      this.navigateToRoute(this.routes[targetIndex]);
    }
  }
  
  /**
   * Gets the current route path
   */
  private getCurrentRoute(): string {
    const url = this.router.url;
    return url === '/' ? '' : url.substring(1);
  }
  
  /**
   * Navigates to the specified route
   */
  private navigateToRoute(route: string): void {
    const path = route === '' ? '/' : `/${route}`;
    this.router.navigate([path]);
  }
}
