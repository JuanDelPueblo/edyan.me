import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../../components/shared/card/card';
import { StringService } from '../../services/string.service';
import { Experience } from '../../config/strings';

@Component({
  selector: 'experiences',
  imports: [Card, CommonModule],
  templateUrl: './experiences.html',
  styleUrl: './experiences.scss'
})
export class Experiences implements OnInit {
  experiences: Experience[] = [];
  sectionContent: any = {};

  constructor(private stringService: StringService) {}

  ngOnInit(): void {
    this.experiences = this.stringService.getAllExperiences();
    this.sectionContent = this.stringService.getExperiencesSectionContent();
  }
}
