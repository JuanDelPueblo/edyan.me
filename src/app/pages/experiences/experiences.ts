import { Component, input, OnInit } from '@angular/core';
import { Card } from '../../components/card/card';
import { Experience } from '../../types/datatypes';
import { Timeline } from '../../components/timeline/timeline';

@Component({
  selector: 'experiences',
  imports: [Card, Timeline],
  templateUrl: './experiences.html',
  styleUrl: './experiences.scss'
})
export class Experiences {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly experiences = input.required<Experience[]>();

}
