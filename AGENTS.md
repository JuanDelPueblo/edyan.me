## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and
`astro dev logs`.

## Implementation

- Prefer straightforward code and plain loops. Avoid extra abstractions,
  configuration, generics, or validation without a concrete need.
- Keep TypeScript types simple. Use inference where possible and annotate the
  exported content data where needed.
- Destructure component data directly from `Astro.props.project` or
  `Astro.props.experience` instead of creating an intermediate variable.
- Use Tailwind utility classes for styling. Keep the plain presentation until a
  visual design is requested.

## Content

- Store editable portfolio information in YAML, separate from component markup.
  Load it directly rather than introducing content collections or runtime
  schemas.
- Keep profile information and the ordered project/experience lists together in
  `src/content/index.yaml`. List entries are filenames without `.yaml`; omitting
  an entry hides it. Do not add separate visibility flags or ordering fields.
- Keep individual projects and experiences in their respective content folders.
  Maintain copyable YAML examples in `src/content/templates/` and exclude
  templates from content loading.
- Preserve supplied portfolio wording and URLs unless a content change is
  requested. Read the resume URL from YAML rather than bundling a separate copy.

## Writing

- Use concise, neutral documentation and comments. Describe behavior directly
  and use imperative instructions for tasks. Prefer plain language and short
  sentences; avoid first-person wording, conversational framing, and a
  teacher-to-reader tone.
- Keep the README short, focused on the project and development commands. Put
  content examples in the YAML templates instead of lengthy editing tutorials.
- Add brief comments for Astro-specific behavior and non-obvious logic. Explain
  what the code does without narrating every line.

## Formatting and checks

- Use the repository's Prettier configuration, including the Astro plugin,
  80-column print width, and prose wrapping. Let Prettier handle formatting
  across supported file types.
- Run `npm run format` to format supported files and `npm run format:check` to
  verify formatting.
- Run `npm run build` for code or configuration changes. Check responsive layout
  and keyboard navigation when changing markup or styling.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
