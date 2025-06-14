# Theme Service

A comprehensive theming service for Angular that handles light/dark mode switching with system theme detection.

## Features

- 🌙 Automatic system theme detection
- 💾 User preference persistence in localStorage
- 🎨 CSS custom properties for dynamic theming
- 📱 Mobile browser theme-color meta tag support
- ⚡ Signal-based reactive state management
- 🔄 Smooth theme transitions

## Usage

### Basic Setup

The theme service is automatically initialized when injected into the app component. It will:
1. Check for saved user preferences
2. Fall back to system theme if no preference is saved
3. Listen for system theme changes
4. Apply the appropriate theme classes to the document root

### Injecting the Service

```typescript
import { Component, inject } from '@angular/core';
import { ThemeService } from './services/theme.service';

@Component({...})
export class MyComponent {
  private themeService = inject(ThemeService);
  
  // Access current theme
  get currentTheme() {
    return this.themeService.currentTheme();
  }
  
  // Check if dark mode is active
  get isDarkMode() {
    return this.themeService.isDarkMode();
  }
}
```

### Available Methods

- `setTheme(theme: 'light' | 'dark')` - Set a specific theme
- `toggleTheme()` - Toggle between light and dark
- `setSystemTheme()` - Reset to follow system preference
- `isSystemTheme()` - Check if following system preference

### Theme Toggle Component

A ready-to-use theme toggle component is available:

```html
<theme-toggle></theme-toggle>
```

### CSS Custom Properties

The following CSS custom properties are available for styling:

```css
/* Background colors */
--bg-primary        /* Main background */
--bg-secondary      /* Secondary background */
--bg-card          /* Card background */
--bg-form-input    /* Form input background */

/* Text colors */
--text-primary     /* Primary text */
--text-secondary   /* Secondary text */
--text-muted       /* Muted text */

/* Border colors */
--border-color     /* Standard borders */
--border-subtle    /* Subtle borders */

/* Other */
--shadow-color     /* Box shadow color */
--overlay-bg       /* Overlay background */
```

### SCSS Mixins

Use these mixins in your component styles:

```scss
@use 'scss/mixins' as *;

.my-component {
  @include theme-colors;          // Apply theme background and text
  @include theme-card;            // Apply theme card styling
  @include theme-text-primary;    // Apply primary text color
  @include theme-text-secondary;  // Apply secondary text color
  @include theme-border;          // Apply theme border color
}
```

### Utility Classes

Predefined utility classes for quick theming:

```html
<div class="theme-text-primary">Primary text color</div>
<div class="theme-text-secondary">Secondary text color</div>
<div class="theme-bg-primary">Primary background</div>
<div class="theme-border">Themed border</div>
```

## Server-Side Rendering (SSR)

The service is SSR-friendly and includes platform checks to ensure browser-only APIs are only called in the browser environment.

## Customization

To customize theme colors, update the CSS custom properties in `src/scss/_variables.scss`:

```scss
:root {
  --bg-primary: #your-light-bg;
  --text-primary: #your-light-text;
  // ... other light theme colors
}

.dark-theme {
  --bg-primary: #your-dark-bg;
  --text-primary: #your-dark-text;
  // ... other dark theme colors
}
```
