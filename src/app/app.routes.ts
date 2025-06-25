import { Routes } from '@angular/router';
import { Hero } from './pages/hero/hero';
import { Projects } from './pages/projects/projects';
import { Experiences } from './pages/experiences/experiences';

export const routes: Routes = [
  { path: '', component: Hero, data: { animation: 'home' } }, // Default route (home page with about me merged)
  { path: 'projects', component: Projects, data: { animation: 'projects' } },
  { path: 'experiences', component: Experiences, data: { animation: 'experiences' } },
  { path: '**', redirectTo: '' } // Wildcard route - redirect to home for any unmatched routes
];
