import { Component, input } from '@angular/core';
import { Experience, Project } from '../../types/datatypes';
import { ExperienceItem } from './experience_item/experience_item';

@Component({
  selector: 'timeline',
  imports: [ExperienceItem],
  templateUrl: './timeline.html',
  styleUrl: './timeline.scss'
})
export class Timeline {
  readonly experiences = input.required<Experience[]>();
}
