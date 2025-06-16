import { TestBed } from '@angular/core/testing';

import { StringService } from './string.service';

describe('StringService', () => {
  let service: StringService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StringService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get string by key path', () => {
    const title = service.getString('hero.title');
    expect(title).toBe('Welcome to My Portfolio');
  });

  it('should return key as fallback for missing strings', () => {
    const missing = service.getString('nonexistent.key');
    expect(missing).toBe('nonexistent.key');
  });

  it('should get all projects', () => {
    const projects = service.getAllProjects();
    expect(projects).toBeTruthy();
    expect(projects.length).toBeGreaterThan(0);
  });

  it('should get featured projects only', () => {
    const featuredProjects = service.getFeaturedProjects();
    expect(featuredProjects.every(p => p.featured)).toBe(true);
  });

  it('should get project by id', () => {
    const project = service.getProjectById('flight-tracker-pro');
    expect(project).toBeTruthy();
    expect(project?.title).toBe('Flight Tracker Pro');
  });

  it('should get all experiences', () => {
    const experiences = service.getAllExperiences();
    expect(experiences).toBeTruthy();
    expect(experiences.length).toBeGreaterThan(0);
  });

  it('should get current experience', () => {
    const currentExp = service.getCurrentExperience();
    expect(currentExp).toBeTruthy();
    expect(currentExp?.current).toBe(true);
  });

  it('should get all technologies', () => {
    const technologies = service.getAllTechnologies();
    expect(technologies).toBeTruthy();
    expect(technologies.length).toBeGreaterThan(0);
    expect(technologies).toContain('Angular');
  });

  it('should get navigation items', () => {
    const navItems = service.getNavigationItems();
    expect(navItems).toBeTruthy();
    expect(navItems.length).toBeGreaterThan(0);
  });

  it('should get section content', () => {
    const heroContent = service.getSection('hero');
    expect(heroContent).toBeTruthy();
    expect(heroContent.title).toBe('Welcome to My Portfolio');
  });
});
