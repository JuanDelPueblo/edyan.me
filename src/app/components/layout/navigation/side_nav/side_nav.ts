import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Card } from '../../../shared/card/card';
import { ThemeToggle } from '../../../shared/theme_toggle/theme_toggle';
import { Subject, filter, takeUntil } from 'rxjs';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'side-nav',
  imports: [RouterLink, RouterLinkActive, MatIconModule, Card, ThemeToggle],
  templateUrl: './side_nav.html',
  styleUrl: './side_nav.scss'
})
export class SideNav implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('navList', { static: true }) navList!: ElementRef<HTMLUListElement>;
  @ViewChild('activeIndicator', { static: true }) activeIndicator!: ElementRef<HTMLDivElement>;

  private destroy$ = new Subject<void>();

  navItems: NavItem[] = [
    { path: '/', label: 'Home', icon: 'home', exact: true },
    { path: '/projects', label: 'Projects', icon: 'work' },
    { path: '/experiences', label: 'Experiences', icon: 'business' },
    { path: '/contact', label: 'Contact', icon: 'contact_mail' }
  ];

  constructor(private router: Router) {}
  ngOnInit() {
    // Listen to route changes to update indicator position
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // Faster update for direct navigation clicks
        setTimeout(() => this.updateIndicatorPosition(), 10);
      });
  }

  ngAfterViewInit() {
    // Set initial position
    setTimeout(() => this.updateIndicatorPosition(), 10);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateIndicatorPosition() {
    // Guard for browser environment and ensure DOM API exists
    if (typeof window === 'undefined' || !this.navList.nativeElement.getBoundingClientRect) {
      return;
    }
    const activeLink = this.navList.nativeElement.querySelector('a.active') as HTMLAnchorElement;
    
    if (activeLink && this.activeIndicator) {
      const listRect = this.navList.nativeElement.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      
      // Calculate position relative to the nav list
      const top = linkRect.top - listRect.top;
      const height = linkRect.height;
      
      this.activeIndicator.nativeElement.style.transform = `translateY(${top}px)`;
      this.activeIndicator.nativeElement.style.height = `${height}px`;
      this.activeIndicator.nativeElement.style.opacity = '1';
    }
  }
}
