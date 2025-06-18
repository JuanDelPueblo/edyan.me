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
  
  // Scroll accumulation properties
  private scrollCount = 0;
  private readonly requiredScrolls = 3; // Number of scroll events needed
  private lastScrollDirection: 'up' | 'down' | null = null;
  private scrollResetTimeout: any = null;
  private readonly scrollResetDelay = 1000; // Reset counter after 1 second of no scrolling
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
    
    // Determine scroll direction
    const scrollDirection: 'up' | 'down' = event.deltaY > 0 ? 'down' : 'up';
    
    // Check if we're at the edge and can navigate
    const canNavigateDown = scrollDirection === 'down' && isAtBottom && currentIndex < this.routes.length - 1;
    const canNavigateUp = scrollDirection === 'up' && isAtTop && currentIndex > 0;
    
    if (!canNavigateDown && !canNavigateUp) {
      this.resetScrollCount();
      return;
    }
    
    // Reset count if direction changed or timeout occurred
    if (this.lastScrollDirection !== scrollDirection) {
      this.resetScrollCount();
      this.lastScrollDirection = scrollDirection;
    }
    
    // Clear existing timeout
    if (this.scrollResetTimeout) {
      clearTimeout(this.scrollResetTimeout);
    }
    
    // Increment scroll count
    this.scrollCount++;
    
    // Set timeout to reset counter
    this.scrollResetTimeout = setTimeout(() => {
      this.resetScrollCount();
    }, this.scrollResetDelay);
    
    // Check if we've reached the required number of scrolls
    if (this.scrollCount >= this.requiredScrolls) {
      let targetIndex = -1;
      let direction = '';
      
      if (canNavigateDown) {
        targetIndex = currentIndex + 1;
        direction = 'forward';
      } else if (canNavigateUp) {
        targetIndex = currentIndex - 1;
        direction = 'backward';
      }
      
      if (targetIndex !== -1) {
        this.lastScrollTime = now;
        this.isNavigating = true;
        this.resetScrollCount();
        this.navigateToRoute(this.routes[targetIndex], direction);
        
        // Reset navigation flag after animation completes
        setTimeout(() => {
          this.isNavigating = false;
        }, 500); // Match the 400ms animation + small buffer
      }
    }
  }
  
  /**
   * Resets the scroll count and related state
   */
  private resetScrollCount(): void {
    this.scrollCount = 0;
    this.lastScrollDirection = null;
    if (this.scrollResetTimeout) {
      clearTimeout(this.scrollResetTimeout);
      this.scrollResetTimeout = null;
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
