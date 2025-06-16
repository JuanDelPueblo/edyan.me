# String Provider Service

This service provides centralized string management for the portfolio website, making it easy to maintain and update all text content from a single location.

## Features

- **Centralized Text Management**: All website text in one configuration file
- **Dynamic Lists**: Support for projects and experiences that can be easily added/updated
- **Type Safety**: Full TypeScript support with interfaces
- **Filtering Methods**: Built-in methods to filter projects and experiences
- **Easy Maintenance**: Add new content by simply updating the configuration

## Usage

### Basic String Access

```typescript
// Inject the service
constructor(private stringService: StringService) {}

// Get simple strings
const title = this.stringService.getString('hero.title');
const subtitle = this.stringService.getString('hero.subtitle');

// Get entire sections
const heroContent = this.stringService.getHeroContent();
const contactForm = this.stringService.getSection('contact.form');
```

### Working with Projects

```typescript
// Get all projects (sorted by order)
const allProjects = this.stringService.getAllProjects();

// Get only featured projects
const featured = this.stringService.getFeaturedProjects();

// Get specific project
const project = this.stringService.getProjectById('flight-tracker-pro');

// Filter by technology
const angularProjects = this.stringService.getProjectsByTechnology('Angular');
```

### Working with Experiences

```typescript
// Get all experiences (sorted by order)
const experiences = this.stringService.getAllExperiences();

// Get current experience
const current = this.stringService.getCurrentExperience();

// Get specific experience
const experience = this.stringService.getExperienceById('google-swe-intern-2025');

// Filter by company
const googleExps = this.stringService.getExperiencesByCompany('Google');
```

### Navigation and Common UI

```typescript
// Get navigation items
const navItems = this.stringService.getNavigationItems();

// Get common UI strings
const common = this.stringService.getCommonStrings();
```

## Adding New Content

### Adding a New Project

1. Open `src/app/config/strings.ts`
2. Add a new project object to the `projects` array:

```typescript
{
  id: 'my-new-project',
  title: 'My New Project',
  description: 'Description of the project...',
  technologies: ['React', 'Node.js', 'MongoDB'],
  image: '/images/my-project.png',
  liveUrl: 'https://myproject.com',
  githubUrl: 'https://github.com/username/my-project',
  featured: true,
  order: 4
}
```

### Adding a New Experience

1. Open `src/app/config/strings.ts`
2. Add a new experience object to the `experiences` array:

```typescript
{
  id: 'new-company-2025',
  position: 'Senior Developer',
  company: 'New Company',
  period: 'September 2025 - Present',
  description: [
    'Led development of new features',
    'Mentored junior developers'
  ],
  technologies: ['Angular', 'TypeScript', 'AWS'],
  current: true,
  order: 1
}
```

### Updating Static Text

Simply modify the values in the `STRINGS` object in `src/app/config/strings.ts`.

## File Structure

```
src/app/
├── config/
│   └── strings.ts          # Main configuration file
├── services/
│   ├── string.service.ts   # Service implementation
│   └── string.service.spec.ts # Tests
```

## Types

The service includes TypeScript interfaces for type safety:

- `Project`: Interface for project objects
- `Experience`: Interface for experience objects  
- `NavigationItem`: Interface for navigation items
- `StringsConfig`: Type for the entire strings configuration

## Best Practices

1. **Use Type Safety**: Always import and use the provided interfaces
2. **Consistent Ordering**: Use the `order` property to control display order
3. **Descriptive IDs**: Use kebab-case IDs that describe the content
4. **Fallback Handling**: The service returns the key path as fallback for missing strings
5. **Testing**: Update tests when adding new methods or changing structure

## Future Enhancements

The service is designed to support future features like:
- Internationalization (i18n)
- Dynamic content loading from APIs
- Admin interface for content management
- Content versioning and rollbacks
