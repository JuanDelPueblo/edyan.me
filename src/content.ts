import { parse } from "yaml";
import contentYaml from "./content/index.yaml?raw";

// Field types used by the page and components.
export interface Project {
  title: string;
  description: string;
  technologies: string[];
  image?: string;
  imageAlt?: string;
  githubUrl?: string;
  liveUrl?: string;
}

export interface Experience {
  position: string;
  company: string;
  period: string;
  accomplishments: string[];
  technologies: string[];
}

interface Portfolio {
  pageTitle: string;
  description: string;
  greeting: string;
  title: string;
  introduction: string;
  resume: string;
  contactsTitle: string;
  projectsTitle: string;
  experiencesTitle: string;
  projectsTab: string;
  experiencesTab: string;
  monogram: string;
  avatar?: string;
  timeZone: string;
  clockPlace: string;
  toolboxTitle: string;
  toolboxIcons: Record<string, string>;
  badges: { image: string; alt: string; url?: string }[];
  contacts: { name: string; url: string }[];
  projects: string[];
  experiences: string[];
}

// Import YAML as text at build time. Templates are excluded from this glob.
const files = import.meta.glob("./content/{projects,experiences}/*.yaml", {
  query: "?raw",
  import: "default",
  eager: true,
});

// Load the listed files in display order. Unlisted files stay off the page.
function loadEntries(group: string, list: string[]) {
  const entries = [];
  for (const entry of list) {
    const path = `./content/${group}/${entry}.yaml`;
    // Report the filename when a listed entry has no matching YAML file.
    if (!(path in files)) {
      throw new Error(
        `Missing ${group}/${entry}.yaml, listed in content/index.yaml.`,
      );
    }
    entries.push(parse(files[path]));
  }
  return entries;
}

export const portfolio = parse(contentYaml) as Portfolio;

export const projects: Project[] = loadEntries("projects", portfolio.projects);
export const experiences: Experience[] = loadEntries(
  "experiences",
  portfolio.experiences,
);
