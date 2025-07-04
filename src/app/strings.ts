import { Contact, Experience, Project } from './datatypes';

export const STRINGS = {
	aboutMe: {
		title: '👋 Hi, I\'m Edyan Antonio Cruz',
		introduction: 'I\'m a passionate software engineer with experience in full-stack development, currently pursuing my career in technology.',
		contactsTitle: 'Get in Touch',
		contacts: [
			{
				name: 'Email',
				url: 'mailto:edyancruz@outlook.com',
				icon: 'matEmailRound',
			},
			{
				name: 'GitHub',
				url: 'github.com/juandelpueblo',
				icon: 'faBrandGithub',
			},
			{
				name: 'LinkedIn',
				url: 'linkedin.com/in/edyancruz',
				icon: 'faBrandLinkedin',
			},
			{
				name: 'Discord',
				url: 'https://discord.com/users/271392262510870528',
				icon: 'faBrandDiscord',
			}
		] as Contact[],
	},
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
	},
	experiences: {
		title: 'Professional Experience',
		description: 'My professional journey and the experiences that have shaped my career in technology.',
		experiencesList: [
			{
				position: 'Software Engineering Intern',
				company: 'Google',
				period: 'May 2025 - August 2025',
				description: [
					'Gemini Apps Team',
					'Working on cutting-edge AI applications and user experiences'
				],
				technologies: ['TypeScript', 'Angular', 'Python', 'Machine Learning'],
			},
			{
				position: 'STEP Intern',
				company: 'Google',
				period: 'May 2024 - August 2024',
				description: [
					'Google Messages For Web Team',
					'Contributed to web-based messaging platform development'
				],
				technologies: ['JavaScript', 'Web APIs', 'Frontend Development'],
			}
		] as Experience[],
	},
}