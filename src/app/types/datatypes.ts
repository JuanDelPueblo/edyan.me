export interface NavItem {
	sectionId: string;
	label: string;
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