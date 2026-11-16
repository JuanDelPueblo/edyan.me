# edyan.me

Portfolio website for Edyan Antonio Cruz, built with Astro and TailwindCSS.

## Development server

Requires Node.js 22.23.4 or newer. To install dependencies and start the
development server, run:

```sh
npm ci
npm run dev -- --background
```

To check the server status, view logs, or stop the server, run:

```sh
npm run astro -- dev status
npm run astro -- dev logs
npm run astro -- dev stop
```

## Building

To build the site into `dist/`, run:

```sh
npm run build
```

## Checks

To type-check the Astro components and scripts, run:

```sh
npm run check
```

## Formatting

```sh
npm run format
npm run format:check
```

## Deployment

Pushes to `master` run `.github/workflows/deploy.yml`, which builds the site and
publishes it to GitHub Pages. The Pages source must be set to GitHub Actions in
the repository settings.
