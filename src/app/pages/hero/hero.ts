import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../../components/shared/card/card';
import { StringService } from '../../services/string.service';

@Component({
  selector: 'hero',
  imports: [
    Card,
    CommonModule
  ],
  templateUrl: './hero.html',
  styleUrl: './hero.scss'
})
export class Hero implements OnInit {
  heroContent: any = {};

  constructor(private stringService: StringService) {}

  ngOnInit(): void {
    this.heroContent = this.stringService.getHeroContent();
  }
}
