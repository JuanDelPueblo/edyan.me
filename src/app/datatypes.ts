export interface NavItem {
	sectionId: string;
	label: string;
	icon: string;
}

export interface Contact {
	name: string;
	url?: string;
	icon: string;
}

export interface Project {
	id: string;
	title: string;
	description: string;
	technologies: string[];
	image?: string;
	liveUrl?: string;
	githubUrl?: string;
}

export interface Experience {
	position: string;
	company: string;
	period: string;
	description: string[];
	technologies: string[];
	current: boolean;
}