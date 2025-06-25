import { Project } from './types/datatypes';

export const STRINGS = {
	projects: {
		title: 'My Projects',
		description: 'Here are some of the projects I\'ve worked on, showcasing my skills and passion for development.',
		projectsList: [
			{
				id: 'flight-tracker-pro',
				title: 'Flight Tracker Pro',
				description: 'A comprehensive flight tracking application with real-time updates and beautiful visualizations.',
				technologies: ['Angular', 'TypeScript', 'API Integration', 'RxJS'],
				image: '/images/flighttrackerpro.png',
				liveUrl: '',
				githubUrl: '',
			},
			{
				id: 'dont-let-him-cook',
				title: 'Don\'t Let Him Cook',
				description: 'A fun and interactive cooking game that challenges players with creative culinary scenarios.',
				technologies: ['JavaScript', 'Game Development', 'Web APIs', 'Canvas'],
				image: '/images/dontlethimcook.png',
				liveUrl: '',
				githubUrl: '',
			},
			{
				id: 'portfolio-website',
				title: 'Portfolio Website',
				description: 'A modern, responsive portfolio website built with the latest web technologies.',
				technologies: ['Angular', 'SCSS', 'Responsive Design', 'TypeScript'],
				image: '',
				liveUrl: '',
				githubUrl: '',
			}
		] as Project[],
	}
}