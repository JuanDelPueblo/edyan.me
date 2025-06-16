import { Routes } from '@angular/router';
import { Hero } from './pages/hero/hero';
import { Projects } from './pages/projects/projects';
import { Experiences } from './pages/experiences/experiences';
import { Contact } from './pages/contact/contact';

export const routes: Routes = [
  { path: '', component: Hero }, // Default route (home page with about me merged)
  { path: 'projects', component: Projects },
  { path: 'experiences', component: Experiences },
  { path: 'contact', component: Contact },
  { path: '**', redirectTo: '' } // Wildcard route - redirect to home for any unmatched routes
];
