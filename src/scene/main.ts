// WebGL background: sky, sun, rainbow, clouds and islands above the
// waterline, and a sea that deepens down the page to a coral reef at the bottom.
import * as THREE from "three";
import { createBubbles } from "./bubbles";
import { createDolphins } from "./dolphin";
import { createFish } from "./fish";
import { createIslands } from "./island";
import { createJellies } from "./jelly";
import { createKelp } from "./kelp";
import { createOcean } from "./ocean";
import { createPost } from "./post";
import { createReadout } from "./readout";
import { createSeabed } from "./seabed";
import { createShade } from "./shade";
import { createSky } from "./sky";
import { createUnderwater } from "./under";
import { sfx } from "../scripts/sound";
import { D_REF, EYE, FOV, TAN, U, type View } from "./view";

// Extra canvas above and below the viewport. The canvas scrolls with the
// page between frames, so this hides its edges during fast scrolling. Touch
// flings scroll fastest, so coarse pointers get more.
const OVERSCAN = matchMedia("(pointer: coarse)").matches ? 140 : 96;

// Quality steps when frames run slow, best first: 0 full, 1 without MSAA,
// 2 without bloom, then lower resolutions. One step past the last, the
// scene stops animating and only redraws when the page scrolls or resizes.
const SCALES = [1, 1, 1, 0.8, 0.64, 0.5];
const STILL = SCALES.length;
// The level reached is kept for the next visit, so a slow device does not
// start at full quality every time.
const LEVEL_KEY = "scene-level";
// Frame intervals in ms: the normal cap, and the rate after a while
// without input.
const FRAME = 1000 / 60;
const IDLE_FRAME = 1000 / 30;
const IDLE_AFTER = 30000;

export function startScene(canvas: HTMLCanvasElement, site: HTMLElement) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: "default",
      // Software rendering is too slow for the scene; the CSS background
      // stays instead.
      failIfMajorPerformanceCaveat: true,
    });
  } catch {
    // No WebGL 2 context, which three.js requires.
    return false;
  }
  // Reading shader logs back costs a round trip per program at start-up.
  renderer.debug.checkShaderErrors = import.meta.env.DEV;
  // Some browsers hand out a software context all the same; its name
  // gives it away.
  const gl = renderer.getContext();
  // Firefox names the GPU in RENDERER; Chrome needs the extension.
  let gpu = String(gl.getParameter(gl.RENDERER));
  if (/^webkit/i.test(gpu)) {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    if (info) gpu = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
  }
  if (/swiftshader|llvmpipe|softpipe|software/i.test(gpu)) {
    // dispose() alone leaves the context open.
    renderer.forceContextLoss();
    renderer.dispose();
    return false;
  }
  renderer.autoClear = false;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const hdr = renderer.extensions.has("EXT_color_buffer_float");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  // Measures 100lvh, which does not change as mobile toolbars slide away.
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:100lvh;visibility:hidden;pointer-events:none";
  document.body.append(probe);

  const view: View = {
    w: 0,
    h: 0,
    lvh: 0,
    top: 0,
    scroll: 0,
    wl: 236,
    hz: 190,
    left: 16,
    orbLeft: 0,
    orbBottom: 0,
    k: 0.001,
    mpp: 0.006,
    pr: 1,
    time: 0,
    dt: 0,
    camX: 0,
    camY: -1,
    floorY: -10,
    layout: 0,
    seaTop: 0,
    cover: [0, 0, 0, 0],
  };
  let docHeight = 0;
  let level = 0;
  try {
    // A saved still level starts one step better, in case it was set by a
    // passing slowdown.
    const saved = Number(localStorage.getItem(LEVEL_KEY)) || 0;
    level = Math.max(0, Math.min(STILL - 1, Math.round(saved)));
  } catch {
    // Storage is blocked; start at full quality.
  }
  // Best level still allowed; rises when a step back up does not hold.
  let ceiling = 0;
  let raisedAt = -Infinity;
  // Whether this screen gets MSAA at full quality.
  let msaa = true;

  const colorType = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const main = new THREE.WebGLRenderTarget(4, 4, {
    type: colorType,
    samples: 0,
    depthBuffer: true,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  // The water reads blurred reflections from the mirror's mip levels.
  const mirror = new THREE.WebGLRenderTarget(4, 4, {
    type: colorType,
    depthBuffer: true,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
  });
  const post = createPost(renderer, hdr);
  const landShade = createShade(1024);
  // A narrow page shows a narrow strip of the reef, which a smaller map
  // covers just as finely.
  const reefShade = createShade(innerWidth < 700 ? 1024 : 2048);
  const reefBox = new THREE.Box3();
  const readout = import.meta.env.DEV ? createReadout(renderer) : null;
  // Development only: `?load=8` draws every frame eight times, which costs
  // about what one frame costs on a GPU eight times slower.
  const load = import.meta.env.DEV
    ? Number(new URLSearchParams(location.search).get("load")) || 1
    : 1;

  // Above the water.
  const skyScene = new THREE.Scene();
  const skyCam = new THREE.PerspectiveCamera(FOV, 1, 0.3, 8000);
  skyCam.position.set(0, EYE, 0);
  // The mirror camera sits as far below the surface as the sky camera sits
  // above it; its picture, flipped, is what the water reflects.
  const mirrorCam = new THREE.PerspectiveCamera();
  mirrorCam.position.set(0, -EYE, 0);
  const MIRROR_TAN = 0.5;
  const sky = createSky();
  const islands = createIslands();
  const ocean = createOcean(mirror.texture);
  skyScene.add(sky.backdrop, sky.clouds, sky.bow, sky.gulls);
  skyScene.add(islands.hill, islands.cay, islands.broadleaf, islands.palms);
  const pod = createDolphins();
  skyScene.add(ocean, ...pod.meshes);

  // Below the water.
  const seaScene = new THREE.Scene();
  const seaCam = new THREE.PerspectiveCamera(FOV, 1, 0.15, 160);
  const sea = createUnderwater();
  const kelp = createKelp();
  const seabed = createSeabed();
  const bubbles = createBubbles();
  const fish = createFish();
  const jellies = createJellies();
  seaScene.add(sea.backdrop, sea.ceiling, sea.sand);
  seaScene.add(seabed.blobs, seabed.branches, seabed.stars);
  seaScene.add(kelp.kelp, kelp.grass, ...fish.meshes);
  seaScene.add(jellies.mesh, bubbles.motes, bubbles.streams, bubbles.burst);

  // The window frame behind the content panel is opaque, so the canvas
  // behind the panel is never seen. An invisible quad drawn first, at the
  // near plane, makes the depth test reject everything behind the panel; the
  // final pass skips the same pixels.
  const panels = [...site.querySelectorAll<HTMLElement>(".aero-panel")];
  const cover = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: { uRect: { value: new THREE.Vector4() } },
      vertexShader: /* glsl */ `
        uniform vec4 uRect; // left, bottom, right, top in clip space
        void main() {
          gl_Position = vec4(mix(uRect.xy, uRect.zw, position.xy * 0.5 + 0.5), -1.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        void main() {
          gl_FragColor = vec4(0.0);
        }
      `,
      colorWrite: false,
      depthFunc: THREE.AlwaysDepth,
    }),
  );
  cover.frustumCulled = false;
  cover.renderOrder = -20;
  seaScene.add(cover);
  // Page rectangle of the panel on show: left, top, right, bottom. Empty
  // while the panel or an ancestor animates, and while the content is
  // hidden.
  const hidden = new THREE.Vector4();
  function findHidden() {
    hidden.set(0, 0, 0, 0);
    if (site.classList.contains("scene-only")) return;
    const panel = panels.find((el) => el.offsetParent);
    if (!panel) return;
    for (let el = panel; el !== site; el = el.parentElement!) {
      for (const animation of el.getAnimations()) {
        if (animation.playState === "running") return;
      }
    }
    const box = panel.getBoundingClientRect();
    const siteBox = site.getBoundingClientRect();
    hidden.set(
      box.left - siteBox.left,
      box.top - siteBox.top,
      box.right - siteBox.left,
      box.bottom - siteBox.top,
    );
  }

  let dirty = true;
  const banner = site.querySelector(".aero-banner");
  const title = site.querySelector(".aero-title");
  const orb = site.querySelector(".aero-orb");
  new ResizeObserver(() => (dirty = true)).observe(site);
  addEventListener("resize", () => (dirty = true));
  document.fonts?.ready.then(() => (dirty = true));

  // Reads page sizes and rebuilds whatever depends on them.
  function measure() {
    dirty = false;
    const siteBox = site.getBoundingClientRect();
    const w = site.clientWidth;
    const lvh = probe.offsetHeight || innerHeight;
    docHeight = site.offsetHeight;
    // The waterline is the header's bottom edge.
    const bannerBox = banner?.getBoundingClientRect();
    const wl = bannerBox ? Math.round(bannerBox.bottom - siteBox.top) : 300;
    const left = bannerBox ? bannerBox.left - siteBox.left : 16;
    if (title) {
      const box = title.getBoundingClientRect();
      U.uExcl.value.set(
        box.left - siteBox.left,
        box.top - siteBox.top,
        box.right - siteBox.left,
        box.bottom - siteBox.top,
      );
    }
    if (orb) {
      const box = orb.getBoundingClientRect();
      view.orbLeft = box.left - siteBox.left;
      view.orbBottom = box.bottom - siteBox.top;
    }
    const h = lvh + 2 * OVERSCAN;
    // Cap the pixel count, lower on high-density screens; quality drops
    // further if frames run slow.
    const budget = devicePixelRatio > 1 ? 2.5e6 : 4.6e6;
    const base = Math.min(
      devicePixelRatio,
      w < 700 ? 1.5 : 2,
      Math.sqrt(budget / (w * h)),
    );
    const pr = base * SCALES[Math.min(level, STILL - 1)];
    // Aliasing is hard to see at 1.5 device px per CSS px and above. Large
    // screens skip MSAA too: four samples of a half-float target cost about
    // 60 bytes per pixel, too much GPU memory for a background.
    msaa = base < 1.5 && w * h * base * base < 3e6;
    const samples = msaa && level === 0 ? 4 : 0;
    if (samples !== main.samples) {
      // The target reallocates with the new sample count on its next use.
      main.samples = samples;
      main.dispose();
    }
    const same =
      w === view.w && lvh === view.lvh && wl === view.wl && left === view.left;
    if (same && pr === view.pr) return;
    if (!same) placed++;
    const resized = w !== view.w || h !== view.h || pr !== view.pr;
    view.w = w;
    view.h = h;
    view.lvh = lvh;
    view.wl = wl;
    view.left = left;
    view.pr = pr;
    view.k = (2 * TAN) / lvh;
    view.mpp = view.k * D_REF;
    view.hz = wl - Math.min(110, Math.max(34, wl * 0.2));
    view.layout++;

    if (resized) {
      canvas.style.height = h + "px";
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h, false);
      const dw = canvas.width;
      const dh = canvas.height;
      main.setSize(dw, dh);
      mirror.setSize(Math.min(768, Math.round(dw / 2.5)), 160);
      post.resize(dw, dh);
      post.uniforms.uSize.value.set(w, h);
      post.uniforms.uPx.value = w / dw;
    }
    for (const cam of [skyCam, seaCam]) {
      cam.aspect = w / lvh;
    }

    // The sun sits in the right margin; lighting follows from where it is.
    const narrow = Math.min(1, Math.max(0, (w - 400) / 700));
    U.uSunSize.value = 0.6 + 0.4 * narrow;
    const sunX = w - Math.max(44 + 20 * narrow, left * 0.42);
    const sunRow = Math.max(30, wl * (0.11 + 0.09 * narrow));
    post.uniforms.uSun.value.set(sunX, sunRow);
    const sx = (sunX - w / 2) * view.k;
    const sy = (view.hz - sunRow) * view.k;
    U.uSunDir.value.set(sx, sy, -1).normalize();
    U.uLight.value.set(sx * 1.4 + 0.25, 0.8, 0.45).normalize();
    U.uSunU.value.set(sx * 0.9 + 0.2, 0.86, -0.25).normalize();

    // Mirror frustum: the full width with a margin, from the horizon up.
    const near = 0.3;
    const half = (w / 2) * view.k * 1.25;
    mirrorCam.projectionMatrix.makePerspective(
      -half * near,
      half * near,
      MIRROR_TAN * near,
      0,
      near,
      8000,
    );
    mirrorCam.projectionMatrixInverse.copy(mirrorCam.projectionMatrix).invert();
    ocean.material.uniforms.uReflMap.value.set(1 / (2 * half), 1 / MIRROR_TAN);

    sky.layout(view);
    islands.layout(view);
    pod.layout(view);
    kelp.layout(view);
    seabed.layout(view);
    bubbles.layout(view);
  }

  // Pointer: fish shy away from it, and a click on the open water releases
  // bubbles and scatters the fish nearby.
  let hoverX = -1;
  let hoverY = -1;
  // Where the pointer is, -1..1, and the eased value the cameras follow.
  let aimX = 0;
  let aimY = 0;
  let lookX = 0;
  let lookY = 0;
  addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse") return;
      hoverX = event.clientX;
      hoverY = event.clientY;
      aimX = (event.clientX / innerWidth) * 2 - 1;
      aimY = (event.clientY / innerHeight) * 2 - 1;
    },
    { passive: true },
  );
  // Viewport position to the same position in the underwater camera's frame.
  function frameY(clientY: number) {
    return clientY - (innerHeight - view.lvh) / 2 - seaShift;
  }
  addEventListener("pointerdown", (event) => {
    const target = event.target as Element | null;
    if (!target || !view.w || lost) return;
    const open =
      target === site ||
      target.parentElement === site ||
      (target.closest(".aero-banner") && !target.closest("a, button"));
    if (!open) return;
    // A click on the fort is answered by a coqui.
    const pageY = event.clientY + scrollY;
    if (islands.onFort(skyCam, event.clientX, pageY - view.top, view)) {
      sfx("coqui");
      return;
    }
    // A still scene would leave the bubbles frozen in place.
    if (reduced.matches || level === STILL || pageY < view.wl + 8) return;
    const dist = 3.2;
    const y = frameY(event.clientY);
    bubbles.pop(
      view.camX + (event.clientX - view.w / 2) * view.k * dist,
      Math.min(-0.2, view.camY + (view.lvh / 2 - y) * view.k * dist),
      -dist,
      9,
    );
    sfx("bubbles");
    if (fish.startle(view, event.clientX, y, 210, 2.6)) sfx("blip");
  });

  // Draws the shadow maps. The shaders that read a map draw into it too, so
  // they get an empty one meanwhile.
  // Counts changes of the page's sizes. A change of resolution alone, as a
  // quality step makes, leaves the maps as they are.
  let placed = 0;
  let baked = "";
  function bakeShade(tallest: number) {
    U.tLandShade.value = null;
    U.uLandShade.value.y = landShade.bake(
      renderer,
      skyScene,
      islands.shadeBox,
      U.uLight.value,
      U.uLandShadeMat.value,
    );
    U.tLandShade.value = landShade.texture;

    // The reef's map covers the seabed out to where the fog hides shadows,
    // as wide as the reef is laid out there. It is drawn with the floor at
    // zero, so it stays valid while the seabed moves, and with the plants
    // standing still.
    const far = 22;
    const half = ((view.w / 2 + 160) * view.mpp * far) / D_REF;
    reefBox.min.set(-half, -0.7, -far);
    reefBox.max.set(half, Math.max(2.2, tallest) + 0.3, -1.5);
    const floorY = U.uFloorY.value;
    U.uFloorY.value = 0;
    U.uSway.value = 0;
    U.tReefShade.value = null;
    U.uReefShade.value.y = reefShade.bake(
      renderer,
      seaScene,
      reefBox,
      U.uSunU.value,
      U.uReefShadeMat.value,
    );
    U.tReefShade.value = reefShade.texture;
    U.uSway.value = 1;
    U.uFloorY.value = floorY;
  }

  // The page falls back to its CSS background while the context is lost.
  let lost = false;
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
    site.classList.remove("scene-live");
  });
  canvas.addEventListener("webglcontextrestored", () => {
    lost = false;
    shown = false;
    drawn = "";
    // The maps come back empty.
    baked = "";
  });

  // Input keeps the full frame rate; scrolling draws on every display
  // frame so the parallax layers stay in step with the page.
  let inputAt = performance.now();
  let scrolledAt = -Infinity;
  function wake() {
    const now = performance.now();
    // Coming back from the idle rate: draw on the next frame, and leave
    // the long gap out of the timing.
    if (now - inputAt > IDLE_AFTER) {
      due = 0;
      last = 0;
    }
    inputAt = now;
  }
  for (const type of [
    "pointermove",
    "pointerdown",
    "click",
    "keydown",
    "wheel",
  ]) {
    addEventListener(type, wake, { passive: true });
  }
  addEventListener(
    "scroll",
    () => {
      wake();
      scrolledAt = performance.now();
    },
    { passive: true },
  );

  // Steps quality down or back up. A step up that runs slow again within
  // a few seconds sets the ceiling, so the targets are not reallocated
  // back and forth.
  function setLevel(next: number, now: number) {
    if (next === 1 && !msaa) next = next > level ? 2 : 0;
    if (next > level && now - raisedAt < 10000) {
      ceiling = Math.max(ceiling, level + 1);
    }
    if (next < level) raisedAt = now;
    level = next;
    dirty = true;
    pace = expected;
    slowFor = 0;
    goodFor = 0;
    try {
      localStorage.setItem(LEVEL_KEY, String(level));
    } catch {
      // Storage is blocked; the level lasts for this visit only.
    }
  }

  let last = 0;
  let due = 0;
  let floorSet = false;
  let shown = false;
  let seaShift = 0;
  // Display frame interval measured before the first draw. A browser that
  // limits animation frames to 30 fps sets the expected pace, so the cap
  // alone does not lower quality.
  let expected = FRAME;
  let pace = FRAME;
  // How long, in ms, frames have been running late or on time.
  let slowFor = 0;
  let goodFor = 0;
  let startedAt = 0;
  let drewAt = 0;
  let checkedAt = 0;
  let drawn = "";

  // Animation frames stop in a hidden tab, so the loop cannot see the gap.
  // Restart the timing on return, with the same grace period as at load,
  // so the gap and the stutter after it do not read as slow frames.
  document.addEventListener("visibilitychange", () => {
    last = 0;
    due = 0;
    startedAt = 0;
  });

  function frame(now: number) {
    requestAnimationFrame(frame);
    if (document.hidden || lost) {
      last = 0;
      due = 0;
      return;
    }
    // Draw at most 60 fps (30 fps when idle). The due time advances by
    // whole intervals, so 144 Hz screens still average 60.
    const idle = now - inputAt > IDLE_AFTER;
    const scrolling = now - scrolledAt < 200;
    const interval = scrolling ? 0 : idle ? IDLE_FRAME : FRAME;
    if (now < due - 2) return;
    due = Math.max(due + interval, now);

    const still = reduced.matches || level === STILL;
    // A still picture changes only with scrolling, resizing or a panel
    // switch, so the page is checked on every frame shortly after input
    // and ten times a second otherwise.
    const quiet = !scrolling && !dirty && now - inputAt > 250;
    if (still && quiet && now - checkedAt < 100) {
      last = 0;
      return;
    }
    checkedAt = now;
    // At the still level a frame is slow to draw, so scrolling redraws at
    // most ten times a second; the last one comes once scrolling stops.
    if (level === STILL && scrolling && now - drewAt < 100) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    // Step quality down when frames keep arriving late, and back up after
    // a long run of frames on time. The first moments are left out, while
    // the page is still loading.
    startedAt ||= now;
    if (last && !still && now - startedAt > 1500) {
      const gap = now - last;
      const target = idle ? Math.max(expected, IDLE_FRAME) : expected;
      // Running average over about 400 ms. Each frame counts for at most
      // four intervals, so one long stall does not read as a slow device.
      pace += (Math.min(gap, target * 4) - pace) * Math.min(1, gap / 400);
      if (pace > target * 1.3) {
        slowFor += Math.min(gap, 200);
        goodFor = 0;
      } else if (pace < target * 1.1) {
        // The idle rate is easy to hold, so it never raises the level.
        if (!idle) goodFor += gap;
        slowFor = 0;
      } else {
        slowFor = 0;
        goodFor = 0;
      }
      const over = pace / target;
      if (slowFor > 1500 && level < STILL - 1) {
        // Far over budget, skip levels instead of taking them one by one.
        const steps = over > 3 ? 3 : over > 1.8 ? 2 : 1;
        setLevel(Math.min(level + steps, STILL - 1), now);
      } else if (slowFor > 3000 && over > 2.5 && level === STILL - 1) {
        setLevel(STILL, now);
      }
      if (goodFor > 8000 && level > ceiling) setLevel(level - 1, now);
    }
    last = now;
    if (dirty) measure();
    if (!view.w) return;

    const scroll = Math.max(0, scrollY);
    if (!still) view.time += dt;
    view.dt = still ? 0 : dt;
    view.scroll = scroll;
    U.uTime.value = view.time + 20;

    // Park the canvas over the viewport, in page coordinates.
    const { w, h, lvh, wl, hz, mpp, pr } = view;
    const frameTop = scroll + (innerHeight - lvh) / 2;
    const top = Math.round(
      Math.max(0, Math.min(frameTop - OVERSCAN, docHeight - h)),
    );
    view.top = top;
    canvas.style.transform = `translate3d(0,${top}px,0)`;

    // The underwater camera looks level, so its horizon would sit at the
    // middle of the viewport. With a tall header the waterline is near
    // there too, which would leave no view of the surface from below. At
    // the top of the page the camera's frame is shifted down to keep a
    // strip of it; the shift eases away over the first stretch of scroll.
    const strip = lvh * 0.2;
    function shiftAt(y: number) {
      return Math.max(0, wl + strip - lvh / 2 - y * 0.5);
    }
    // Depth that puts the surface, D_REF away, on the waterline.
    function depthAt(y: number) {
      return Math.max(0.4, (lvh / 2 + shiftAt(y) - wl + y) * mpp);
    }
    seaShift = shiftAt(scroll);
    // The camera sinks as the page scrolls, and the seabed sits where the
    // page ends: D_REF away it shows about a fifth up from the bottom edge.
    const maxScroll = Math.max(0, docHeight - innerHeight);
    const above = Math.max(0.6, (lvh * 0.31 - shiftAt(maxScroll)) * mpp);
    const floorTarget = -(depthAt(maxScroll) + above);
    if (!floorSet) view.floorY = floorTarget;
    floorSet = true;
    view.floorY += (floorTarget - view.floorY) * Math.min(1, dt * 4);
    view.camY = -depthAt(scroll);
    U.uCamDepth.value = -view.camY;
    U.uFloorY.value = view.floorY;

    // With reduced motion the scene is a still picture that only follows
    // scrolling and resizing.
    findHidden();
    // The part of the panel that hides the scene: its inside, less a margin
    // for the rounded corners and for the few pixels the final pass reads
    // to the side of each one it draws.
    const open = hidden.z - hidden.x > 60 && hidden.w - hidden.y > 60;
    view.cover = open
      ? [hidden.x + 14, hidden.y + 14, hidden.z - 14, hidden.w - 14]
      : [0, 0, 0, 0];
    view.seaTop = frameTop + seaShift;
    const key = `${scroll}|${top}|${view.layout}|${view.floorY.toFixed(3)}|${hidden.x}|${hidden.y}|${hidden.z}|${hidden.w}`;
    if (still && key === drawn) return;
    drawn = key;
    drewAt = now;

    readout?.begin();
    if (!still && hoverX >= 0) {
      fish.startle(view, hoverX, frameY(hoverY), 80, 1.1);
      hoverX = -1;
    }
    // Plants taller than 7.7 m do not exist, so the cut-off matters below
    // that only.
    const tallest = Math.min(8, kelp.update(view));
    fish.update(view);
    jellies.update(view);
    bubbles.update(view);
    // The shadow maps follow the page's sizes and the plants' height.
    const shadeKey = placed + "|" + tallest.toFixed(1);
    if (shadeKey !== baked) {
      baked = shadeKey;
      bakeShade(tallest);
    }

    skyCam.setViewOffset(w, lvh, 0, top - hz + lvh / 2, w, h);
    // The cameras drift a little and lean with the pointer, which shifts
    // near things more than far ones.
    lookX += (aimX - lookX) * Math.min(1, view.dt * 2.2);
    lookY += (aimY - lookY) * Math.min(1, view.dt * 2.2);
    view.camX = lookX * 0.16 + Math.sin(view.time * 0.37) * 0.03;
    const bob = Math.sin(view.time * 0.5) * 0.02 - lookY * 0.05;
    seaCam.position.set(view.camX, view.camY + bob, 0);
    skyCam.position.x = lookX * 2.4;
    mirrorCam.position.x = skyCam.position.x;
    const offY = top - frameTop - seaShift;
    seaCam.setViewOffset(w, lvh, 0, offY, w, h);
    // Skip the sand while the lowest view ray meets the dunes' top beyond
    // the plane's far edge, about 80 m out.
    const lowest = (offY + h - lvh / 2) * view.k;
    const drop = view.camY + 0.07 - (view.floorY + 0.62);
    sea.sand.visible = drop <= 0 || (lowest > 0 && drop / lowest < 80);
    // The final pass skips the panel's inside, less its rounded corners.
    const hole = post.uniforms.uHole.value;
    cover.visible = open;
    if (open) {
      hole.set(hidden.x + 5, hidden.y + 5, hidden.z - 5, hidden.w - 5);
      const [x0, y0, x1, y1] = view.cover;
      cover.material.uniforms.uRect.value.set(
        (x0 / w) * 2 - 1,
        1 - ((y1 - top) / h) * 2,
        (x1 / w) * 2 - 1,
        1 - ((y0 - top) / h) * 2,
      );
    } else {
      hole.set(0, 0, 0, 0);
    }

    const dw = main.width;
    const dh = main.height;
    const skyRows = Math.max(0, Math.min(dh, Math.round((wl - top) * pr)));
    U.uPage.value.set(1 / pr, top + h, 1);

    const p = post.uniforms;
    p.uTop.value = top;
    p.uWl.value = wl;
    p.uTime.value = U.uTime.value;
    p.uCenter.value.set(w / 2, scroll + innerHeight / 2);
    p.uFlare.value = Math.max(
      0,
      Math.min(1, (p.uSun.value.y - scroll + 70) / 110),
    );
    for (let pass = 0; pass < load; pass++) {
      if (skyRows > 0) {
        ocean.visible = false;
        U.uPage.value.z = 0;
        renderer.setRenderTarget(mirror);
        renderer.clear();
        renderer.render(skyScene, mirrorCam);
        ocean.visible = true;
        U.uPage.value.z = 1;

        main.scissorTest = true;
        main.scissor.set(0, dh - skyRows, dw, skyRows);
        renderer.setRenderTarget(main);
        renderer.clear();
        renderer.render(skyScene, skyCam);
      }
      if (skyRows < dh) {
        main.scissorTest = true;
        main.scissor.set(0, 0, dw, dh - skyRows);
        renderer.setRenderTarget(main);
        renderer.clear();
        renderer.render(seaScene, seaCam);
      }
      post.render(main, level < 2);
    }
    readout?.end(level, pace);

    // Shaders are compiled before the loop starts, so the first picture is
    // complete.
    if (!shown) {
      shown = true;
      site.classList.add("scene-live");
    }
  }
  // Compiles every shader without blocking the page, then starts drawing.
  // Animation frame intervals measured meanwhile set the expected pace.
  async function start() {
    const gaps: number[] = [];
    let ready = false;
    let prev = 0;
    function tick(now: number) {
      if (prev) gaps.push(now - prev);
      prev = now;
      if (!ready || gaps.length < 10) requestAnimationFrame(tick);
      else begin();
    }
    function begin() {
      gaps.sort((a, b) => a - b);
      expected = Math.max(FRAME, gaps[Math.floor(gaps.length / 4)]);
      pace = expected;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(tick);
    // compileAsync never settles once the context is lost, so a loss ends
    // the wait. The frame loop then idles until the context is restored,
    // and three.js compiles the shaders again on the first draw.
    const lostDuringStart = new Promise((resolve) =>
      canvas.addEventListener("webglcontextlost", resolve, { once: true }),
    );
    try {
      await Promise.race([
        Promise.all([
          renderer.compileAsync(skyScene, skyCam),
          renderer.compileAsync(seaScene, seaCam),
          post.compile(),
        ]),
        lostDuringStart,
      ]);
    } catch {
      // Anything not compiled yet compiles on its first draw.
    }
    if (lost) {
      ready = true;
      return;
    }
    // Without KHR_parallel_shader_compile (Firefox), compileAsync returns
    // before the programs have linked, and the first draw would then wait
    // for all of them at once. Reading a program's uniforms waits for that
    // program alone, so the waits are spread over several frames here.
    let since = performance.now();
    for (const program of renderer.info.programs ?? []) {
      program.getUniforms();
      program.getAttributes();
      if (performance.now() - since > 4) {
        await new Promise(requestAnimationFrame);
        since = performance.now();
      }
    }
    ready = true;
  }
  start();
  return true;
}
