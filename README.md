# edyan.me

Portfolio website for Edyan Antonio Cruz, built with Astro.

Profile information and ordered project/experience lists are stored in
`src/content/index.yaml`. Omit an entry from its list to hide it. Templates for
new entries are in `src/content/templates/`.

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

## Formatting

```sh
npm run format
npm run format:check
```
