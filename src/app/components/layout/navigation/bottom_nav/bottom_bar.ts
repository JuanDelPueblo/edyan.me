import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Card } from '../../../shared/card/card';
import { Subject } from 'rxjs';

interface NavItem {
  sectionId: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'bottom-bar',
  imports: [MatIconModule, Card],
  templateUrl: './bottom_bar.html',
  styleUrl: './bottom_bar.scss'
})
export class BottomBar implements AfterViewInit, OnDestroy {
  @ViewChild('navList', { static: true }) navList!: ElementRef<HTMLUListElement>;
  @ViewChild('activeIndicator', { static: true }) activeIndicator!: ElementRef<HTMLDivElement>;
  currentActiveSection = 'hero';
  private destroy$ = new Subject<void>();

  navItems: NavItem[] = [
    { sectionId: 'hero', label: 'Home', icon: 'home' },
    { sectionId: 'projects', label: 'Projects', icon: 'work' },
    { sectionId: 'experiences', label: 'Experience', icon: 'business' },
    { sectionId: 'contact', label: 'Contact', icon: 'contact_mail' }
  ];

  ngAfterViewInit(): void {
    setTimeout(() => this.updateActiveIndicator(), 100);
    this.setupSectionObserver();
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
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          this.setActiveSection(sectionId);
        }
      });
    }, options);
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
    if (!this.navList?.nativeElement || !this.activeIndicator?.nativeElement) {
      return;
    }
    const activeIndex = this.navItems.findIndex(item => item.sectionId === this.currentActiveSection);
    if (activeIndex === -1) return;
    const navLinks = this.navList.nativeElement.querySelectorAll('li');
    const activeNavItem = navLinks[activeIndex];
    if (activeNavItem) {
      const listRect = this.navList.nativeElement.getBoundingClientRect();
      const itemRect = activeNavItem.getBoundingClientRect();
      const left = itemRect.left - listRect.left;
      const top = itemRect.top - listRect.top;
      const width = itemRect.width;
      const height = itemRect.height;
      this.activeIndicator.nativeElement.style.transform = `translateX(${left}px) translateY(${top}px)`;
      this.activeIndicator.nativeElement.style.width = `${width}px`;
      this.activeIndicator.nativeElement.style.height = `${height}px`;
      this.activeIndicator.nativeElement.style.opacity = '1';
    }
  }
}
