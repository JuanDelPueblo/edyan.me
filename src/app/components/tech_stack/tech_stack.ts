import { Component, input, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'tech-stack',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './tech_stack.html',
	styleUrls: ['./tech_stack.scss']
})
export class TechStack {
	technologies = input.required<string[]>();
}