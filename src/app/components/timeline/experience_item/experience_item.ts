import { Component, input } from '@angular/core';
import { TechStack } from '../../tech_stack/tech_stack';
import { Experience } from '../../../datatypes';

@Component({
  selector: 'experience-item',
  imports: [TechStack],
  templateUrl: './experience_item.html',
  styleUrl: './experience_item.scss'
})
export class ExperienceItem {
  readonly experience = input.required<Experience>();
}
