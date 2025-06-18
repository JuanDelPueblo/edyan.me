import { Component, inject, HostListener, PLATFORM_ID } from '@angular/core';
import { RouterOutlet, ChildrenOutletContexts } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { SideNav } from './components/layout/navigation/side_nav/side_nav';
import { BottomBar } from './components/layout/navigation/bottom_nav/bottom_bar';
import { ThemeService } from './services/theme.service';
import { ScrollNavigationService } from './services/scroll-navigation.service';
import { slideAnimation } from './animations/route-animations';

@Component({
  selector: 'root',
  imports: [RouterOutlet, SideNav, BottomBar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  animations: [slideAnimation]
})
export class App {
  protected title = 'edyan.me';
  private themeService = inject(ThemeService);
  private scrollNavigationService = inject(ScrollNavigationService);
  private contexts = inject(ChildrenOutletContexts);
  private platformId = inject(PLATFORM_ID);

  @HostListener('wheel', ['$event'])
  onScroll(event: WheelEvent): void {
    // Only handle scroll events in the browser
    if (isPlatformBrowser(this.platformId)) {
      this.scrollNavigationService.handleScroll(event);
    }
  }
  getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation'];
  }

  prepareRoute(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'];
  }
}
