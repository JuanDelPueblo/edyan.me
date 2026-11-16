# Aero prototype

Standalone HTML prototype of the Frutiger Aero redesign. It is a reference for
implementation and is not part of the Astro build.

The layout is implemented in the Astro site (`src/components/`), with styles in
`src/styles/global.css`. The background there is a placeholder; this prototype
still has the full DOM scene.

Open `index.html` in a browser. Content is copied from `src/content` into the
page script, so edits to the YAML files do not show here.

Published copy with version history:
https://claude.ai/artifact/VvtvwRaHVpn5wTYgahdLLz

## Contents

- `index.html`: the prototype (round 9). Markup, styles and scripts are inline.
- `images/`: copies of `public/images` used by the project thumbnails.
- `scene/`: background art (clouds, tree, fish, clover). Sources and licenses
  are in `scene/CREDITS.md`. The clouds (CC BY 3.0) and fish (CC BY-SA 3.0)
  require visible attribution on the live site.
- `review/`: UI/UX audit (`REPORT.md`) with its screenshots. The audit covers
  round 6, before the layout restructure, so some findings are already
  addressed.

## Round 9

- The tab strip is a real tablist. Only the selected panel is shown, starting
  with Projects. Arrow keys, Home and End move between tabs, and the URL hash
  (`#projects`, `#experiences`, `#contact`) selects a tab on load. The panel
  collapse toggles are gone. When porting, render every panel and let the script
  hide the inactive ones, so all content shows without JavaScript.
- Links show an XP-style balloon with their destination on mouse hover and on
  keyboard focus. Escape dismisses it, and the pointer can move onto it.
- The header orb reads `monogram` and an optional `avatar` image path from the
  profile data. A set `avatar` replaces the monogram.
- The tab strip ends in a tray clock showing Puerto Rico time. It opens a flyout
  with a large analog clock, the date and the last-updated date. The prototype
  reads the date from `updated`; the live site would stamp it at build time.
- A speaker button in the tray turns on sound effects, synthesized with Web
  Audio so there are no audio files. Tabs and buttons click, background clicks
  and chips bubble, fish blip when startled, the lightbox whooshes and the clock
  chimes. Sound starts off and the choice is remembered per browser.
- A "Toolbox" ticker in its own strip above the tab window scrolls every
  technology as a chip with the number of entries that use it. The strip slows
  to a stop under the pointer or keyboard focus and has a pause button. The
  chips are one tab stop; arrow keys, Home and End move between them. A chip's
  balloon lists the entries, and clicking it switches tabs if needed and makes
  those entries glow. With reduced motion the chips show as a still, wrapped
  list.

## Open decisions

- The layout is ready to implement. The background scene (sky, water, clouds,
  fish, bubbles, grass) will be redesigned after the initial implementation,
  likely in WebGL. Keep it separate from the layout when porting.
- Tab labels, "View Code" style labels, "Site last updated" and "Used in" are
  hard-coded in the prototype. Move any that stay into YAML, along with
  `monogram`, `avatar`, `timeZone`, `clockPlace`, `updated` and `toolboxTitle`.
- Choose a photo for the header orb, or keep the "EC" monogram.
- The live site replaced the prototype's CSS 88x31 badges with 80x15 antipixel
  images in `public/badges/`, listed in `src/content/index.yaml`.
- The scene images are being replaced. Settle attribution once the final images
  are in.
