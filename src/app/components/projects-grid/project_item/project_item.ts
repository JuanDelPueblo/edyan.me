import { Component, input } from '@angular/core';
import { TechStack } from '../../tech_stack/tech_stack';
import { Project } from '../../../types/datatypes';

@Component({
  selector: 'project-item',
  imports: [TechStack],
  templateUrl: './project_item.html',
  styleUrl: './project_item.scss'
})
export class ProjectItem {
  readonly project = input.required<Project>();

  onBtnClick(url?: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }
}
