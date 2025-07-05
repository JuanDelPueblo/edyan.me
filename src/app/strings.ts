import { Contact, Experience, Project } from './datatypes';

export const STRINGS = {
	aboutMe: {
		title: 'I\'m Edyan Antonio Cruz',
		introduction: 'I\'m a 4th-year Computer Science student at the University of Puerto Rico Mayagüez, with a passion for user-facing software development and robotics.',
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
				id: 'rumarino-auv',
				title: 'RUMarino Autonomous Underwater Vehicle (AUV)',
				description: 'Led a team of three software engineers to develop RUMarino\'s AUV software framework utilizing ROS and Docker to participate in RoboSub 2025.',
				technologies: ['Python', 'ROS', 'Docker', 'CUDA'],
				image: '/images/hydrus.jpeg',
				liveUrl: '',
				githubUrl: 'https://github.com/Rumarino-Team',
			},
			{
				id: 'dont-let-him-cook',
				title: 'Don\'t Let Him Cook',
				description: 'A simple platformer game made using Godot for the Fall 2023 CAHSI Game Jam, which received 3rd place out of 13 total submitted games.',
				technologies: ['Godot', 'GDScript'],
				image: '/images/dontlethimcook.png',
				liveUrl: 'https://juandelpueblo.itch.io/dont-let-him-cook',
				githubUrl: 'https://github.com/juandelpueblo/dont-let-him-cook',
			},
			{
				id: 'discord-application-bot',
				title: 'Discord Application Bot',
				description: 'Discord Bot for managing application forms within a Discord server. Each form is managed in a single channel where the applications are answered inside threads.',
				technologies: ['TypeScript', 'Discord.JS', 'Node.js', 'SQLite'],
				image: '/images/discordapplicationbot.png',
				liveUrl: '',
				githubUrl: 'https://github.com/juandelpueblo/discord-application-bot'
			},
			{
				id: 'flight-tracker-pro',
				title: 'Flight Tracker Pro',
				description: 'Collaborated with a 3-person team to build an flight searching app for Android in Kotlin using Android Studio in 3 weeks utilizing queries from the AviationStack API.',
				technologies: ['Kotlin', 'Android Studio', 'API Integration'],
				image: '/images/flighttrackerpro.png',
				liveUrl: '',
				githubUrl: '',
			},
			{
				id: 'classcorder',
				title: 'ClassCorder',
				description: 'Led the development of the intuitive dashboard for a lecture recording web application using Python and Streamlit as part of a 3-person group project for Google Tech Exchange.',
				technologies: ['Python', 'Streamlit', 'Google Cloud', 'BigQuery'],
				image: '',
				liveUrl: '',
				githubUrl: '',
			},
		] as Project[],
	},
	experiences: {
		title: 'Professional Experience',
		description: 'My professional journey and the experiences that have shaped my career in technology.',
		experiencesList: [
			{
				position: 'SWE Intern',
				company: 'Google',
				period: 'May 2025 - Aug 2025',
				description: [
					'Built an UI component gallery using an internal storybook library for the Gemini web page using Angular and Typescript to preview and test UI elements in isolation, shortening the development process of UI components.',
					'Prototyped and assessed the feasibility of features such as temporary chat and conversation grouping, gaining hands-on experience in product ideation and user flow optimization.'
				],
				technologies: ['TypeScript', 'Angular', 'Java'],
			},
			{
				position: 'STEP Intern',
				company: 'Google',
				period: 'May 2024 - Aug 2024',
				description: [
					'Integrated Google Photos media picker into Google Messages for Web using Angular and TypeScript, reducing time spent attaching media by 50%.',
					'Added a progress bar and enhanced attachments error handling, improving the existing user end-to-end attachment flow.'
				],
				technologies: ['TypeScript', 'Angular'],
			}
		] as Experience[],
	},
}