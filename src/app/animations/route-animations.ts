import { trigger, transition, style, animate, query, group } from '@angular/animations';

export const slideAnimation = trigger('routeAnimations', [
  // Forward navigation (scrolling down) - slide down
  transition('home => projects, projects => experiences, experiences => contact, home => experiences, home => contact, projects => contact', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'flex-start', // flex-start works sometimes
        justifyContent: 'center'
      })
    ], { optional: true }),

    query(':enter', [
      style({ transform: 'translateY(150%)' })
    ], { optional: true }),

    group([
      query(':leave', [
        animate('400ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          style({ transform: 'translateY(-150%)' }))
      ], { optional: true }),

      query(':enter', [
        animate('400ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          style({ transform: 'translateY(0%)' }))
      ], { optional: true })
    ])
  ]),

  // Backward navigation (scrolling up) - slide up
  transition('projects => home, experiences => projects, contact => experiences, contact => projects, contact => home, experiences => home', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center'
      })
    ], { optional: true }),

    query(':enter', [
      style({ transform: 'translateY(-150%)' })
    ], { optional: true }),

    group([
      query(':leave', [
        animate('400ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          style({ transform: 'translateY(150%)' }))
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
