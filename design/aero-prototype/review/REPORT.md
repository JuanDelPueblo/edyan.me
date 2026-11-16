# UI/UX audit (round 6)

Audit of the round 6 prototype by a separate reviewer. Screenshots in this
folder belong to this audit. Items marked done were addressed in rounds 7–9.

## Overall verdict

The surface details already read as Vista-era Aero: glossy title bars, pill
buttons, bevelled glass, sun and lens flare, bubbles and grass. The page felt
incomplete for three reasons:

- The scene was only a backdrop. The waterline, bubbles and grass sat behind the
  content or in the gutters, so the page read as floating cards on a blue
  gradient.
- There was no "site furniture" such as a clock, last-updated line, badges or
  colourful icons.
- UI chrome animated constantly, so it read as busy rather than alive.

Era note: Frutiger Aero belongs to 2006–2009 (Vista, IE7, Web 2.0). The coherent
target is a student's personal site around 2007. 2004 idioms such as 88x31
badges still fit because personal sites lagged behind.

## 1. Era and style consistency

Reads as authentic: aqua title bars with a hard 49/51% gloss split, pill
buttons, underlined text links, white bevelled thumbnail frames, Verdana and
Trebuchet text, the fixed centred page, sun and flare, light ribbons, bubbles.

Slips toward modern:

- High: separate floating cards with gaps. Era sites used one framed page with
  boxes inside it. (Done: single frame.)
- High: the sidebar ran out of content far above the main column. (Done: sidebar
  removed, contacts moved below Experiences.)
- Medium: the title used negative tracking and a looping shimmer. Use a logo
  treatment with outline glow and a reflection. (Done.)
- Medium: monochrome glyph icons. Use full-colour glossy icons. (Done.)
- Medium: the "EC" monogram reads like a modern initials avatar. A photo in a
  glossy frame or a water-drop mark would be more period-correct. (Open; round 9
  adds support for a photo.)
- Low: the waving hand looped forever. (Done: waves once and on hover.)
- Low: contact links changed letter-spacing on hover, causing reflow. (Done.)

## 2. What was missing

- The scene never entered the content: thin waterline, tree hidden at 1024px,
  fish behind panels. (Done: thick waterline, reflection, tree in the header,
  fish lane, bubble column and grass overlapping the frame.)
- No site furniture. (Partly done: badges added. A clock and a build-time "last
  updated" line remain options.)
- No layering inside the frame. (Partly done through the reflection and
  overlaps.)
- ClassCorder had no image and broke the rhythm. (Done: placeholder.)
- Thumbnails too small to read. (Done: lightbox.)

## 3. Gimmicks, ranked

1. Wet-floor reflection of the header in the water. (Done.)
2. Thick glass waterline. (Done.)
3. Lightbox for thumbnails using `<dialog>`. (Done.)
4. Sidebar gadgets: an analog clock in Puerto Rico time and a "last updated"
   line generated at build time. Any caption text belongs in YAML. (Prototyped
   in round 9 as a tray clock with a flyout.)
5. 88x31 link badges. (Done; badge text is placeholder.)
6. Interactive fish that dart away from the cursor. (Done.)
7. Aqua scrollbar. (Done.)
8. XP-style balloon tooltips showing link destinations; must also appear on
   keyboard focus. (Done in round 9.)
9. Click sounds, only behind a speaker toggle that is off by default.
   (Prototyped in round 9 with synthesized sounds.)
10. A tech marquee; must pause on hover and focus and stay static with reduced
    motion. (Prototyped in round 9 as the Toolbox ticker.)

Rejected: a Flash-style "Loading…" splash (blocks content), draggable panels
(break layout and keyboard use), a fake hit counter (dishonest on a static
site).

## 4. Layout

Recommended layout A: one glass page frame, a glossy tab strip on top, and a
sticky gadget sidebar. (Done, then revised in round 8 to a single column with
contacts below Experiences and a sticky tab strip.)

Alternative layout B: a two-pane "Vista window" with DHTML tabs. Rejected
because Experiences would sit behind a click. (Round 9 adopts working tabs at
the owner's request: one panel at a time, Projects first.)

DOM order should follow the content order: greeting, title, intro, resume,
contacts, projects, experiences. (Round 8 moves contacts after experiences at
the owner's request.)

## 5. UX and quality issues

High:

- Reduced motion piled every fish at the left edge. (Done: fish hidden.)
- Too many infinite loops in the UI chrome. (Done: one-shot or hover-only.)
- `backdrop-filter` on the panels recomputed over animated layers. (Done:
  removed from panels.)
- Every scroll on touch devices fired a bubble burst. (Done: mouse clicks only.)

Medium:

- White text on light gloss had low contrast on the resume button, greeting,
  title bars and small buttons. (Done: darker gradients behind the text.)
- The focus ring was hard to see over water. (Done: white and navy ring.)
- Collapse toggles were 19px targets and the heading's accessible name was
  duplicated. Collapsed state persisted between visits. (Done: whole title bar
  is the button, no persistence.)
- Phone screenshots dominated the layout. (Done: thumbnails capped at 140px.)
- The tree disappeared at 1024px. (Done.)
- Spark glows were clipped and costly. (Done: gradient glints, no filters.)
- Several animations repainted every frame. (Partly done.)

Low:

- Default body margin showed a dark frame. (Done.)
- The rainbow halo crossed the intro box at 1024px. (Done: dimmed, moved.)
- Sparks overlapped the title. (Done: kept in the side margins.)
- The trail spawned unbounded nodes. (Done: capped.)
- Scene PNGs are larger than displayed. Resize and convert with Astro `<Image>`
  when porting. (Open.)
- The Ubuntu web font read as 2010s. (Done: removed.)
- Keep `imageAlt ?? title` for thumbnail alt text, as in `ProjectEntry.astro`.
- Labels such as "View Code", "Technologies:" and the tab names are hard-coded.
  Move any that stay into YAML. (Open.)
