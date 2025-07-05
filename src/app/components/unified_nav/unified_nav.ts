import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Card } from '../card/card';
import { ThemeToggle } from './theme_toggle/theme_toggle';
import { NavItem } from '../../datatypes';

@Component({
	selector: 'unified-nav',
	imports: [MatIconModule, Card, ThemeToggle],
	templateUrl: './unified_nav.html',
	styleUrl: './unified_nav.scss'
})
export class UnifiedNav {
	readonly navItems = input.required<NavItem[]>();
}
