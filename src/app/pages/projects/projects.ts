import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../../components/shared/card/card';
import { StringService } from '../../services/string.service';
import { Project } from '../../config/strings';

@Component({
  selector: 'projects',
  imports: [Card, CommonModule],
  templateUrl: './projects.html',
  styleUrl: './projects.scss'
})
export class Projects implements OnInit {
  projects: Project[] = [];
  sectionContent: any = {};

  constructor(private stringService: StringService) {}

  ngOnInit(): void {
    this.projects = this.stringService.getAllProjects();
    this.sectionContent = this.stringService.getProjectsSectionContent();
  }

  onProjectClick(project: Project): void {
    if (project.liveUrl) {
      window.open(project.liveUrl, '_blank');
    }
  }

  onViewCode(project: Project): void {
    if (project.githubUrl) {
      window.open(project.githubUrl, '_blank');
    }
  }
}
