import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Card } from '../../../shared/card/card';
import { ThemeToggle } from '../../../shared/theme_toggle/theme_toggle';
import { Subject } from 'rxjs';

interface NavItem {
  sectionId: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'side-nav',
  imports: [MatIconModule, Card, ThemeToggle],
  templateUrl: './side_nav.html',
  styleUrl: './side_nav.scss'
})
export class SideNav implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('navList', { static: true }) navList!: ElementRef<HTMLUListElement>;
  @ViewChild('activeIndicator', { static: true }) activeIndicator!: ElementRef<HTMLDivElement>;
  private destroy$ = new Subject<void>();
  currentActiveSection = 'hero';

  navItems: NavItem[] = [
    { sectionId: 'hero', label: 'Home', icon: 'home' },
    { sectionId: 'projects', label: 'Projects', icon: 'work' },
    { sectionId: 'experiences', label: 'Experiences', icon: 'business' },
    { sectionId: 'contact', label: 'Contact', icon: 'contact_mail' }
  ];

  constructor() {}

  ngOnInit(): void {
    // Set up intersection observer for active section tracking
    this.setupSectionObserver();
  }

  ngAfterViewInit(): void {
    // Initial position of active indicator
    setTimeout(() => this.updateActiveIndicator(), 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.currentActiveSection = sectionId;
      this.updateActiveIndicator();
    }
  }

  private setupSectionObserver(): void {
    if (typeof window === 'undefined') return;
    
    const options = {
      root: null,
      rootMargin: '-50% 0px -50% 0px',
      threshold: 0
    };    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          this.setActiveSection(sectionId);
        }
      });
    }, options);// Observe all sections
    this.navItems.forEach(item => {
      const element = document.getElementById(item.sectionId);
      if (element) {
        observer.observe(element);
      }
    });
  }

  private setActiveSection(sectionId: string): void {
    this.currentActiveSection = sectionId;
    this.updateActiveIndicator();
  }

  private updateActiveIndicator(): void {
    if (typeof window === 'undefined' || !this.navList?.nativeElement || !this.activeIndicator?.nativeElement) {
      return;
    }

    // Find the active nav item based on current section
    const activeIndex = this.navItems.findIndex(item => item.sectionId === this.currentActiveSection);
    if (activeIndex === -1) return;

    const navLinks = this.navList.nativeElement.querySelectorAll('li');
    const activeNavItem = navLinks[activeIndex];

    if (activeNavItem) {
      const listRect = this.navList.nativeElement.getBoundingClientRect();
      const itemRect = activeNavItem.getBoundingClientRect();
      
      const top = itemRect.top - listRect.top;
      const height = itemRect.height;
      
      this.activeIndicator.nativeElement.style.transform = `translateY(${top}px)`;
      this.activeIndicator.nativeElement.style.height = `${height}px`;
      this.activeIndicator.nativeElement.style.opacity = '1';
    }
  }
}
