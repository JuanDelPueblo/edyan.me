import { Component, input, } from '@angular/core';
import { Card } from '../../components/card/card';
import { Project } from '../../datatypes';
import { ProjectsGrid } from '../../components/projects_grid/projects_grid';

@Component({
  selector: 'projects',
  imports: [Card, ProjectsGrid],
  templateUrl: './projects.html',
})
export class Projects {
  readonly projects = input.required<Project[]>();
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
