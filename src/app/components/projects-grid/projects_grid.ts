import { Component, input } from '@angular/core';
import { ProjectItem } from './project_item/project_item';
import { Project } from '../../types/datatypes';

@Component({
  selector: 'projects-grid',
  imports: [ProjectItem],
  templateUrl: './projects_grid.html',
  styleUrl: './projects_grid.scss'
})
export class ProjectsGrid {
  readonly projects = input.required<Project[]>();
}
