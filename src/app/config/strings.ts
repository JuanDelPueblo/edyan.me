// Types for structured data
export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  image?: string;
  liveUrl?: string;
  githubUrl?: string;
  featured: boolean;
  order: number;
}

export interface Experience {
  id: string;
  position: string;
  company: string;
  period: string;
  description: string[];
  technologies?: string[];
  current: boolean;
  order: number;
}

export interface NavigationItem {
  label: string;
  route: string;
  icon?: string;
}

// Main strings configuration
export const STRINGS = {
  // Navigation
  navigation: {
    items: [
      { label: 'Home', route: '/', icon: 'home' },
      { label: 'About', route: '/about', icon: 'person' },
      { label: 'Projects', route: '/projects', icon: 'work' },
      { label: 'Experience', route: '/experiences', icon: 'timeline' },
      { label: 'Contact', route: '/contact', icon: 'mail' }
    ] as NavigationItem[]
  },
  // Hero section
  hero: {
    title: 'Welcome to My Portfolio',
    subtitle: 'Full Stack Developer & Software Engineer',
    description: 'A passionate software engineering student at the University of Puerto Rico Mayagüez Campus. With interests in Android, game, and full stack web development, I enjoy programming and creating innovative software solutions.',
    cta: {
      primary: 'View My Work',
      secondary: 'Get In Touch'
    }
  },

  // About Me section
  aboutMe: {
    title: 'About Me',
    introduction: 'I\'m a passionate software engineer with experience in full-stack development, currently pursuing my career in technology.',
    skills: [
      'Angular', 'TypeScript', 'JavaScript', 'Python', 'Java',
      'Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'Git',
      'AWS', 'Docker', 'REST APIs', 'GraphQL'
    ],
    skillsTitle: 'Technical Skills'
  },

  // Projects section
  projectsSection: {
    title: 'My Projects',
    intro: 'Here are some of the projects I\'ve worked on, showcasing my skills and passion for development.',
    buttons: {
      viewProject: 'View Project',
      viewCode: 'View Code',
      viewMore: 'View More Projects'
    }
  },

  // Dynamic projects list
  projects: [
    {
      id: 'flight-tracker-pro',
      title: 'Flight Tracker Pro',
      description: 'A comprehensive flight tracking application with real-time updates and beautiful visualizations.',
      technologies: ['Angular', 'TypeScript', 'API Integration', 'RxJS'],
      image: '/images/flighttrackerpro.png',
      liveUrl: '',
      githubUrl: '',
      featured: true,
      order: 1
    },
    {
      id: 'dont-let-him-cook',
      title: 'Don\'t Let Him Cook',
      description: 'A fun and interactive cooking game that challenges players with creative culinary scenarios.',
      technologies: ['JavaScript', 'Game Development', 'Web APIs', 'Canvas'],
      image: '/images/dontlethimcook.png',
      liveUrl: '',
      githubUrl: '',
      featured: true,
      order: 2
    },
    {
      id: 'portfolio-website',
      title: 'Portfolio Website',
      description: 'A modern, responsive portfolio website built with the latest web technologies.',
      technologies: ['Angular', 'SCSS', 'Responsive Design', 'TypeScript'],
      image: '',
      liveUrl: '',
      githubUrl: '',
      featured: false,
      order: 3
    }
  ] as Project[],

  // Experiences section
  experiencesSection: {
    title: 'Professional Experience',
    intro: 'My professional journey and the experiences that have shaped my career in technology.'
  },

  // Dynamic experiences list
  experiences: [
    {
      id: 'google-swe-intern-2025',
      position: 'Software Engineering Intern',
      company: 'Google',
      period: 'May 2025 - August 2025',
      description: [
        'Gemini Apps Team',
        'Working on cutting-edge AI applications and user experiences'
      ],
      technologies: ['TypeScript', 'Angular', 'Python', 'Machine Learning'],
      current: true,
      order: 1
    },
    {
      id: 'google-step-intern-2024',
      position: 'STEP Intern',
      company: 'Google',
      period: 'May 2024 - August 2024',
      description: [
        'Google Messages For Web Team',
        'Contributed to web-based messaging platform development'
      ],
      technologies: ['JavaScript', 'Web APIs', 'Frontend Development'],
      current: false,
      order: 2
    }
  ] as Experience[],

  // Contact section
  contact: {
    title: 'Get In Touch',
    subtitle: 'Let\'s work together',
    description: 'I\'m always open to discussing new opportunities and interesting projects.',
    form: {
      name: 'Name',
      email: 'Email',
      message: 'Message',
      send: 'Send Message',
      sending: 'Sending...',
      success: 'Message sent successfully!',
      error: 'Failed to send message. Please try again.'
    },
    social: {
      title: 'Connect with me',
      email: 'your.email@example.com',
      linkedin: 'https://linkedin.com/in/yourprofile',
      github: 'https://github.com/yourusername'
    }
  },

  // Common UI elements
  common: {
    loading: 'Loading...',
    error: 'Something went wrong',
    retry: 'Try Again',
    close: 'Close',
    next: 'Next',
    previous: 'Previous',
    viewAll: 'View All',
    learnMore: 'Learn More'
  }
};

// Type for the entire strings configuration
export type StringsConfig = typeof STRINGS;
