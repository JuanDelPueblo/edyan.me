import { Injectable } from '@angular/core';
import { STRINGS, Project, Experience, NavigationItem, StringsConfig } from '../config/strings';

@Injectable({
  providedIn: 'root'
})
export class StringService {
  private strings: StringsConfig = STRINGS;

  // Get simple string by key path (e.g., 'hero.title')
  getString(keyPath: string): string {
    const keys = keyPath.split('.');
    let value: any = this.strings;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        console.warn(`String key not found: ${keyPath}`);
        return keyPath; // Return the key as fallback
      }
    }
    
    return typeof value === 'string' ? value : keyPath;
  }

  // Get nested object by key path (e.g., 'hero', 'contact.form')
  getSection(keyPath: string): any {
    const keys = keyPath.split('.');
    let value: any = this.strings;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        console.warn(`Section not found: ${keyPath}`);
        return {};
      }
    }
    
    return value;
  }

  // Navigation methods
  getNavigationItems(): NavigationItem[] {
    return this.strings.navigation.items;
  }

  // Project methods
  getAllProjects(): Project[] {
    return [...this.strings.projects].sort((a, b) => a.order - b.order);
  }

  getFeaturedProjects(): Project[] {
    return this.getAllProjects().filter(project => project.featured);
  }

  getProjectById(id: string): Project | undefined {
    return this.strings.projects.find(project => project.id === id);
  }

  getProjectsByTechnology(tech: string): Project[] {
    return this.getAllProjects().filter(project => 
      project.technologies.some(technology => 
        technology.toLowerCase().includes(tech.toLowerCase())
      )
    );
  }

  // Experience methods
  getAllExperiences(): Experience[] {
    return [...this.strings.experiences].sort((a, b) => a.order - b.order);
  }

  getCurrentExperience(): Experience | undefined {
    return this.strings.experiences.find(exp => exp.current);
  }

  getExperienceById(id: string): Experience | undefined {
    return this.strings.experiences.find(exp => exp.id === id);
  }

  getExperiencesByCompany(company: string): Experience[] {
    return this.getAllExperiences().filter(exp => 
      exp.company.toLowerCase().includes(company.toLowerCase())
    );
  }

  // Hero section
  getHeroContent() {
    return this.strings.hero;
  }

  // About section
  getAboutContent() {
    return this.strings.aboutMe;
  }

  // Projects section metadata
  getProjectsSectionContent() {
    return this.strings.projectsSection;
  }

  // Experiences section metadata
  getExperiencesSectionContent() {
    return this.strings.experiencesSection;
  }

  // Contact section
  getContactContent() {
    return this.strings.contact;
  }

  // Common UI strings
  getCommonStrings() {
    return this.strings.common;
  }

  // Utility method to get all technologies used across projects
  getAllTechnologies(): string[] {
    const allTechs = this.strings.projects.flatMap(project => project.technologies);
    return [...new Set(allTechs)].sort();
  }

  // Utility method to get all companies from experiences
  getAllCompanies(): string[] {
    const companies = this.strings.experiences.map(exp => exp.company);
    return [...new Set(companies)].sort();
  }

  // Method to add new project (for future admin functionality)
  addProject(project: Project): void {
    this.strings.projects.push(project);
  }

  // Method to add new experience (for future admin functionality)
  addExperience(experience: Experience): void {
    this.strings.experiences.push(experience);
  }

  // Method to update project
  updateProject(id: string, updates: Partial<Project>): boolean {
    const index = this.strings.projects.findIndex(p => p.id === id);
    if (index !== -1) {
      this.strings.projects[index] = { ...this.strings.projects[index], ...updates };
      return true;
    }
    return false;
  }

  // Method to update experience
  updateExperience(id: string, updates: Partial<Experience>): boolean {
    const index = this.strings.experiences.findIndex(e => e.id === id);
    if (index !== -1) {
      this.strings.experiences[index] = { ...this.strings.experiences[index], ...updates };
      return true;
    }
    return false;
  }
}
