import { trigger, transition, style, animate, query, group } from '@angular/animations';

export const slideAnimation = trigger('routeAnimations', [
  // Forward navigation (scrolling down) - slide down
  transition('home => projects, projects => experiences, experiences => contact', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      })
    ], { optional: true }),
    
    query(':enter', [
      style({ transform: 'translateY(100%)' })
    ], { optional: true }),
    
    group([
      query(':leave', [
        animate('400ms cubic-bezier(0.4, 0.0, 0.2, 1)', 
                style({ transform: 'translateY(-100%)' }))
      ], { optional: true }),
      
      query(':enter', [
        animate('400ms cubic-bezier(0.4, 0.0, 0.2, 1)', 
                style({ transform: 'translateY(0%)' }))
      ], { optional: true })
    ])
  ]),
  
  // Backward navigation (scrolling up) - slide up
  transition('projects => home, experiences => projects, contact => experiences', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      })
    ], { optional: true }),
    
    query(':enter', [
      style({ transform: 'translateY(-100%)' })
    ], { optional: true }),
    
    group([
      query(':leave', [
        animate('400ms cubic-bezier(0.4, 0.0, 0.2, 1)', 
                style({ transform: 'translateY(100%)' }))
      ], { optional: true }),
      
      query(':enter', [
        animate('400ms cubic-bezier(0.4, 0.0, 0.2, 1)', 
                style({ transform: 'translateY(0%)' }))
      ], { optional: true })
    ])
  ]),
  
  // Initial load - no animation
  transition('void => *', [])
]);
