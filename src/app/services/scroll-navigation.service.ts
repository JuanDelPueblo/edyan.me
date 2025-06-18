import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ScrollNavigationService {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  
  private readonly routes = ['', 'projects', 'experiences', 'contact'];
  private lastScrollTime = 0;
  private readonly scrollThrottle = 500; // Minimum time between scroll navigations
  private isNavigating = false;
  
  /**
   * Handles scroll events to navigate between pages
   * @param event - The wheel event from scrolling
   */
  handleScroll(event: WheelEvent): void {
    // Only handle scroll in browser environment
    if (!isPlatformBrowser(this.platformId)) return;
    
    const now = Date.now();
    if (now - this.lastScrollTime < this.scrollThrottle || this.isNavigating) return;
    
    const currentRoute = this.getCurrentRoute();
    const currentIndex = this.routes.indexOf(currentRoute);
    
    if (currentIndex === -1) return;
    
    const isAtTop = window.scrollY === 0;
    const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1;
    
    let targetIndex = -1;
    let direction = '';
    
    // Scrolling down at bottom of page
    if (event.deltaY > 0 && isAtBottom && currentIndex < this.routes.length - 1) {
      targetIndex = currentIndex + 1;
      direction = 'forward';
    }
    // Scrolling up at top of page
    else if (event.deltaY < 0 && isAtTop && currentIndex > 0) {
      targetIndex = currentIndex - 1;
      direction = 'backward';
    }
    
    if (targetIndex !== -1) {
      this.lastScrollTime = now;
      this.isNavigating = true;
      this.navigateToRoute(this.routes[targetIndex], direction);      // Reset navigation flag after animation completes
      setTimeout(() => {
        this.isNavigating = false;
      }, 500); // Match the 400ms animation + small buffer
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
   * Navigates to the specified route with direction information
   */
  private navigateToRoute(route: string, direction: string): void {
    const path = route === '' ? '/' : `/${route}`;
    this.router.navigate([path], { state: { direction } });
  }
}
