import * as THREE from "three";
import { common, underwater } from "./glsl";
import { underUniforms } from "./under";
import { makeMaterial, rng, type View } from "./view";

// Fish are modelled one unit long with the nose at x = +0.5. u runs from the
// nose (0) to the tip of the tail (1).
interface Shape {
  bodyEnd: number; // u where the tail fin starts
  height: number;
  peak: number; // below 1 moves the deepest point forward
  round: number; // below 1 gives blunter ends
  above: number; // share of the height above the midline
  stalk: number; // height where the tail joins
  snout: number; // length of a narrowed snout, 0 for none
  width: number;
  tail: number; // tail fin height
  fork: number;
  dorsal: number[]; // start u, end u, height, sweep, style
  anal: number[];
}

interface Species {
  shape: Shape;
  count: number;
  school: number; // fish per school, 0 for loners
  size: number; // metres
  speed: number; // metres per second
}

const species: Species[] = [
  // 0 clownfish
  {
    shape: {
      bodyEnd: 0.8,
      height: 0.36,
      peak: 0.72,
      round: 0.7,
      above: 0.5,
      stalk: 0.12,
      snout: 0,
      width: 0.085,
      tail: 0.3,
      fork: 0.04,
      dorsal: [0.22, 0.76, 0.1, 0.5, 3],
      anal: [0.56, 0.76, 0.09, 0.6, 0],
    },
    count: 6,
    school: 0,
    size: 0.3,
    speed: 0.34,
  },
  // 1 blue tang
  {
    shape: {
      bodyEnd: 0.8,
      height: 0.46,
      peak: 0.8,
      round: 0.6,
      above: 0.5,
      stalk: 0.07,
      snout: 0.12,
      width: 0.06,
      tail: 0.3,
      fork: 0.22,
      dorsal: [0.2, 0.77, 0.075, 0.6, 0],
      anal: [0.42, 0.77, 0.07, 0.6, 0],
    },
    count: 5,
    school: 0,
    size: 0.5,
    speed: 0.52,
  },
  // 2 yellow tang
  {
    shape: {
      bodyEnd: 0.8,
      height: 0.54,
      peak: 0.86,
      round: 0.55,
      above: 0.5,
      stalk: 0.07,
      snout: 0.2,
      width: 0.055,
      tail: 0.27,
      fork: 0.1,
      dorsal: [0.2, 0.78, 0.17, 0.7, 1],
      anal: [0.4, 0.78, 0.15, 0.7, 1],
    },
    count: 6,
    school: 0,
    size: 0.4,
    speed: 0.44,
  },
  // 3 moorish idol
  {
    shape: {
      bodyEnd: 0.82,
      height: 0.62,
      peak: 0.9,
      round: 0.6,
      above: 0.5,
      stalk: 0.06,
      snout: 0.22,
      width: 0.05,
      tail: 0.25,
      fork: 0.14,
      dorsal: [0.24, 0.8, 0.5, 1.5, 2],
      anal: [0.45, 0.8, 0.16, 0.9, 1],
    },
    count: 4,
    school: 0,
    size: 0.46,
    speed: 0.38,
  },
  // 4 copperband butterflyfish
  {
    shape: {
      bodyEnd: 0.8,
      height: 0.56,
      peak: 0.95,
      round: 0.6,
      above: 0.5,
      stalk: 0.07,
      snout: 0.3,
      width: 0.05,
      tail: 0.24,
      fork: 0.03,
      dorsal: [0.26, 0.78, 0.13, 0.5, 1],
      anal: [0.46, 0.78, 0.12, 0.5, 1],
    },
    count: 4,
    school: 0,
    size: 0.38,
    speed: 0.34,
  },
  // 5 emperor angelfish
  {
    shape: {
      bodyEnd: 0.8,
      height: 0.5,
      peak: 0.8,
      round: 0.55,
      above: 0.5,
      stalk: 0.09,
      snout: 0.1,
      width: 0.068,
      tail: 0.3,
      fork: 0,
      dorsal: [0.2, 0.8, 0.13, 0.9, 1],
      anal: [0.4, 0.8, 0.12, 0.9, 1],
    },
    count: 3,
    school: 0,
    size: 0.62,
    speed: 0.3,
  },
  // 6 green chromis
  {
    shape: {
      bodyEnd: 0.76,
      height: 0.36,
      peak: 0.75,
      round: 0.75,
      above: 0.5,
      stalk: 0.07,
      snout: 0,
      width: 0.07,
      tail: 0.36,
      fork: 0.5,
      dorsal: [0.24, 0.72, 0.07, 0.6, 0],
      anal: [0.5, 0.72, 0.06, 0.6, 0],
    },
    count: 48,
    school: 24,
    size: 0.17,
    speed: 0.5,
  },
  // 7 yellowtail blue damsel
  {
    shape: {
      bodyEnd: 0.77,
      height: 0.34,
      peak: 0.75,
      round: 0.75,
      above: 0.5,
      stalk: 0.07,
      snout: 0,
      width: 0.072,
      tail: 0.32,
      fork: 0.35,
      dorsal: [0.24, 0.73, 0.07, 0.6, 0],
      anal: [0.5, 0.73, 0.06, 0.6, 0],
    },
    count: 22,
    school: 22,
    size: 0.15,
    speed: 0.56,
  },
];

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Top and bottom of the body outline at u.
function outline(shape: Shape, u: number) {
  const s = Math.min(1, u / shape.bodyEnd);
  let f = Math.pow(Math.sin(Math.PI * Math.pow(s, shape.peak)), shape.round);
  if (shape.snout) f *= 0.3 + 0.7 * smoothstep(0, shape.snout, s);
  const h = shape.height * f + shape.stalk * smoothstep(0.35, 1, s);
  return [h * shape.above, -h * (1 - shape.above)];
}

function finProfile(style: number, s: number) {
  if (style === 1) return Math.pow(Math.sin(Math.PI * Math.pow(s, 1.6)), 0.6);
  if (style === 2) {
    return (
      0.24 * Math.sqrt(Math.sin(Math.PI * s)) +
      Math.exp(-Math.pow((s - 0.2) / 0.11, 2))
    );
  }
  if (style === 3) {
    const front = Math.sin(Math.PI * Math.min(s / 0.55, 1));
    const back =
      0.9 * Math.sin(Math.PI * Math.min(Math.max((s - 0.5) / 0.5, 0), 1));
    return Math.sqrt(Math.max(front, back));
  }
  return Math.sqrt(Math.sin(Math.PI * s));
}

function fishGeometry(shape: Shape) {
  const position: number[] = [];
  const uv: number[] = [];
  const fin: number[] = []; // part, flex, side
  const index: number[] = [];
  function vertex(
    x: number,
    y: number,
    z: number,
    u: number,
    v: number,
    f: number[],
  ) {
    position.push(x, y, z);
    uv.push(u, v);
    fin.push(f[0], f[1], f[2]);
    return position.length / 3 - 1;
  }

  // Body: rings of points around the outline.
  const stations = 22;
  const around = 12;
  for (let i = 0; i <= stations; i++) {
    const t = i / stations;
    const u = shape.bodyEnd * t;
    const [top, bottom] = outline(shape, u);
    const cy = (top + bottom) / 2;
    const ry = (top - bottom) / 2;
    const rz =
      shape.width * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.75) +
      0.018 * smoothstep(0.5, 1, t) +
      0.002;
    for (let j = 0; j < around; j++) {
      const turn = (j / around) * Math.PI * 2;
      vertex(
        0.5 - u,
        cy + ry * Math.cos(turn),
        rz * Math.sin(turn),
        u,
        Math.cos(turn),
        [0, 0, Math.sin(turn)],
      );
    }
  }
  for (let i = 0; i < stations; i++) {
    for (let j = 0; j < around; j++) {
      const a = i * around + j;
      const b = i * around + ((j + 1) % around);
      const c = a + around;
      const d = b + around;
      index.push(a, c, b, b, c, d);
    }
  }

  // Tail fin.
  const start = shape.bodyEnd - 0.03;
  const [stalkTop, stalkBottom] = outline(shape, start);
  const stalkMid = (stalkTop + stalkBottom) / 2;
  const stalkHalf = (stalkTop - stalkBottom) / 2;
  const rows = 7;
  const cols = 7;
  const tailStart = position.length / 3;
  for (let i = 0; i < rows; i++) {
    const t = i / (rows - 1);
    for (let j = 0; j < cols; j++) {
      const v = (j / (cols - 1)) * 2 - 1;
      // The trailing edge is forked or gently rounded.
      const reach =
        (1 - start) *
        (1 - shape.fork * Math.pow(1 - Math.abs(v), 1.3)) *
        (1 - 0.22 * v * v);
      const half = stalkHalf + (shape.tail / 2 - stalkHalf) * Math.pow(t, 0.75);
      vertex(
        0.5 - start - t * reach,
        stalkMid + v * half,
        0,
        start + t * reach,
        v,
        [1, t, 0],
      );
    }
  }
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = tailStart + i * cols + j;
      index.push(a, a + 1, a + cols, a + 1, a + cols + 1, a + cols);
    }
  }

  // Dorsal and anal fins: a strip from the body outline out to the fin edge.
  function strip(spec: number[], part: number, sign: number) {
    const [u0, u1, height, sweep, style] = spec;
    const steps = 14;
    const first = position.length / 3;
    for (let i = 0; i <= steps; i++) {
      const s = i / steps;
      const u = u0 + (u1 - u0) * s;
      const [top, bottom] = outline(shape, u);
      const base = sign > 0 ? top - 0.012 : bottom + 0.012;
      const rise = height * finProfile(style, s);
      vertex(0.5 - u, base, 0, u, sign, [part, 0, 0]);
      vertex(
        0.5 - u - sweep * rise,
        base + sign * rise,
        0,
        u + sweep * rise,
        sign * 2,
        [part, 1, 0],
      );
    }
    for (let i = 0; i < steps; i++) {
      const a = first + i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  strip(shape.dorsal, 2, 1);
  strip(shape.anal, 3, -1);

  // Pectoral fins, one each side.
  const pu = 0.3;
  const [pTop, pBottom] = outline(shape, pu);
  const py = pBottom + (pTop - pBottom) * 0.36;
  for (const side of [-1, 1]) {
    const root = new THREE.Vector3(0.5 - pu, py, side * shape.width * 0.8);
    const along = new THREE.Vector3(-0.8, -0.3, side * 0.5).normalize();
    const across = new THREE.Vector3(0, 1, 0);
    const length = 0.13;
    const points = [
      root,
      root
        .clone()
        .addScaledVector(along, length * 0.6)
        .addScaledVector(across, 0.04),
      root.clone().addScaledVector(along, length),
      root
        .clone()
        .addScaledVector(along, length * 0.6)
        .addScaledVector(across, -0.04),
    ];
    const first = position.length / 3;
    for (let i = 0; i < 4; i++) {
      vertex(points[i].x, points[i].y, points[i].z, pu, -0.3, [
        4,
        i ? 1 : 0,
        side,
      ]);
    }
    index.push(first, first + 1, first + 2, first, first + 2, first + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setIndex(index);
  geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute("aUv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute("aFin", new THREE.Float32BufferAttribute(fin, 3));
  geo.computeVertexNormals();
  // The flat fins face sideways. Their computed normals vanish where a fin
  // tapers to nothing, which would break the lighting there.
  const normal = geo.getAttribute("normal");
  for (let i = 0; i < normal.count; i++) {
    const part = fin[i * 3];
    if (part > 0.5 && part < 3.5) normal.setXYZ(i, 0, 0, 1);
  }
  const [eyeTop, eyeBottom] = outline(shape, 0.13);
  const eye = new THREE.Vector3(
    0.5 - 0.13,
    eyeBottom + (eyeTop - eyeBottom) * 0.62,
    Math.max(0.022, shape.height * 0.075),
  );
  return { geo, eye };
}

const fishVertex = /* glsl */ `
attribute vec2 aUv;
attribute vec3 aFin;
attribute vec4 iPos; // position, length
attribute vec4 iDir; // heading, roll
attribute vec2 iAnim; // tail beat phase, strength
varying vec3 vW;
varying vec3 vN;
varying vec3 vO;
varying vec2 vUv;
varying vec3 vFin;
void main() {
  vec3 p = position;
  float u = 0.5 - p.x;
  // A wave travels down the body and grows towards the tail.
  float amp = iAnim.y * (0.010 + 0.105 * u * u);
  float ph = iAnim.x - u * 5.5;
  p.z += sin(ph) * amp;
  float slope = cos(ph) * 5.5 * amp;
  p.z += aFin.y * sin(iAnim.x * 1.6 - u * 8.0 + aFin.x) * 0.012;
  if (aFin.x > 3.5) {
    p.z += aFin.z * aFin.y * (0.03 + 0.03 * sin(iAnim.x * 1.3));
  }
  vec3 n = normalize(vec3(normal.x - normal.z * slope, normal.y, normal.z + normal.x * slope));

  vec3 f = iDir.xyz;
  vec3 side = normalize(cross(f, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(side, f);
  float c = cos(iDir.w);
  float s = sin(iDir.w);
  vec3 side2 = side * c + up * s;
  vec3 up2 = up * c - side * s;
  vW = iPos.xyz + (f * p.x + up2 * p.y + side2 * p.z) * iPos.w;
  vN = f * n.x + up2 * n.y + side2 * n.z;
  vO = position;
  vUv = aUv;
  vFin = aFin;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}
`;

const fishFragment = /* glsl */ `
${common}
${underwater}
uniform float uKind;
uniform vec3 uEye;
varying vec3 vW;
varying vec3 vN;
varying vec3 vO;
varying vec2 vUv;
varying vec3 vFin;

float band(float x, float center, float halfWidth) {
  return smoothstep(halfWidth + 0.006, halfWidth - 0.002, abs(x - center));
}

vec3 pattern(float u, float v, float part, float flex) {
  vec3 black = vec3(0.012, 0.012, 0.02);
  vec3 white = S(0.99, 0.98, 0.95);
  vec3 c;
  if (uKind < 0.5) {
    // Clownfish: orange with three white bands edged in black.
    c = mix(S(1.0, 0.44, 0.04), S(1.0, 0.56, 0.12), smoothstep(0.2, -0.9, v));
    float uu = u + 0.016 * sin(v * 3.0 + 1.0);
    float wide = max(max(band(uu, 0.2, 0.056), band(uu, 0.47, 0.066)), band(uu, 0.71, 0.044));
    float thin = max(max(band(uu, 0.2, 0.04), band(uu, 0.47, 0.05)), band(uu, 0.71, 0.03));
    c = mix(c, black, wide);
    c = mix(c, white, thin);
    if (part > 0.5) c = mix(c, black, smoothstep(0.62, 0.86, flex));
  } else if (uKind < 1.5) {
    // Blue tang: royal blue, a black sweep along the back, yellow tail.
    c = mix(S(0.03, 0.26, 0.95), S(0.12, 0.48, 1.0), smoothstep(0.2, -0.9, v));
    float back = smoothstep(0.14, 0.26,
      v + 0.9 * smoothstep(0.56, 0.8, u) - 0.5 * smoothstep(0.3, 0.14, u));
    back *= smoothstep(0.12, 0.17, u);
    float gap = smoothstep(1.0, 0.8, length(vec2((u - 0.43) / 0.14, (v - 0.5) / 0.2)));
    c = mix(c, black, back * (1.0 - gap));
    if (part > 0.5 && part < 1.5) {
      c = mix(S(1.0, 0.86, 0.04), black, smoothstep(0.6, 0.78, abs(v)));
    } else if (part > 1.5) {
      c = mix(S(0.03, 0.26, 0.95), black, smoothstep(0.5, 0.85, flex));
    }
  } else if (uKind < 2.5) {
    // Yellow tang.
    c = mix(S(1.0, 0.85, 0.05), S(1.0, 0.95, 0.45), smoothstep(-0.2, -1.0, v) * 0.5);
    float spine = smoothstep(1.0, 0.6, length(vec2((u - 0.73) / 0.04, v / 0.3)));
    c = mix(c, white, spine * step(part, 0.5));
    if (part > 0.5) c *= 0.9 + 0.1 * sin(u * 150.0);
  } else if (uKind < 3.5) {
    // Moorish idol: black, white and yellow bars and a white streamer.
    float uu = u - 0.035 * clamp(v, -1.0, 1.0);
    c = mix(white, S(1.0, 0.86, 0.22), smoothstep(0.5, 0.74, uu));
    float bars = max(
      smoothstep(0.075, 0.092, uu) * smoothstep(0.31, 0.293, uu),
      smoothstep(0.5, 0.517, uu) * smoothstep(0.68, 0.663, uu)
    );
    c = mix(c, black, bars);
    c = mix(c, S(1.0, 0.52, 0.08),
      smoothstep(0.075, 0.06, uu) * smoothstep(0.0, 0.3, v) * step(part, 0.5));
    if (part > 0.5 && part < 1.5) c = mix(black, white, smoothstep(0.78, 0.94, flex));
    if (part > 1.5 && part < 2.5) c = mix(c, white, smoothstep(0.25, 0.5, flex));
  } else if (uKind < 4.5) {
    // Copperband butterflyfish: silver with copper bars and a false eye.
    c = S(0.95, 0.97, 0.97);
    float d = min(min(abs(u - 0.135), abs(u - 0.33)), min(abs(u - 0.51), abs(u - 0.67)));
    c = mix(c, S(0.30, 0.16, 0.08), smoothstep(0.046, 0.038, d));
    c = mix(c, S(1.0, 0.50, 0.04), smoothstep(0.036, 0.028, d));
    c = mix(c, black, band(u, 0.775, 0.016));
    if (part > 1.5 && part < 2.5) {
      float spot = length(vec2((u - 0.62) / 0.05, (flex - 0.5) / 0.3));
      c = mix(c, white, smoothstep(1.4, 1.25, spot));
      c = mix(c, black, smoothstep(1.0, 0.85, spot));
    }
    if (part > 0.5 && part < 1.5) c = S(0.90, 0.94, 0.95);
  } else if (uKind < 5.5) {
    // Emperor angelfish: blue and yellow stripes, a masked face.
    float st = fract(v * 5.5 + u * 4.5);
    float gold = smoothstep(0.0, 0.07, st) * smoothstep(0.5, 0.43, st);
    c = mix(S(0.06, 0.20, 0.82), S(1.0, 0.84, 0.08), gold);
    c = mix(c, S(0.70, 0.86, 0.95), smoothstep(0.25, 0.21, u));
    float chest = smoothstep(1.0, 0.8, length(vec2((u - 0.27) / 0.05, (v + 0.1) / 0.7)));
    c = mix(c, vec3(0.01, 0.02, 0.10), chest * step(part, 0.5));
    float mask = abs(u - 0.132 - 0.012 * v);
    c = mix(c, S(0.10, 0.62, 1.0), smoothstep(0.055, 0.047, mask) * step(part, 0.5));
    c = mix(c, black, smoothstep(0.04, 0.032, mask) * step(part, 0.5));
    if (part > 0.5 && part < 1.5) c = S(1.0, 0.72, 0.06);
    if (part > 1.5) c = mix(c, S(0.10, 0.62, 1.0), smoothstep(0.8, 0.92, flex));
  } else if (uKind < 6.5) {
    // Green chromis.
    c = mix(S(0.62, 0.96, 0.80), S(0.28, 0.74, 0.86), smoothstep(-0.6, 0.9, v));
    if (part > 0.5) c = mix(c, S(0.80, 1.0, 0.92), 0.4);
  } else {
    // Yellowtail blue damsel.
    c = mix(S(0.02, 0.20, 1.0), S(0.10, 0.42, 1.0), smoothstep(0.3, -0.8, v));
    c = mix(c, S(1.0, 0.84, 0.0), smoothstep(0.63, 0.72, u));
  }
  return c;
}

void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  float part = vFin.x;
  vec3 alb = pattern(vUv.x, vUv.y, part, vFin.y);

  // Eye: iris, pupil and a white glint.
  float eye = distance(vO.xy, uEye.xy) / uEye.z;
  float onBody = step(part, 0.5);
  alb = mix(alb, S(0.95, 0.80, 0.30), smoothstep(1.0, 0.9, eye) * onBody);
  alb = mix(alb, vec3(0.01), smoothstep(0.66, 0.56, eye) * onBody);
  float glint = smoothstep(0.26, 0.16,
    distance(vO.xy, uEye.xy + uEye.z * vec2(0.22, 0.26)) / uEye.z) * onBody;

  vec3 view = normalize(cameraPosition - vW);
  // Whiter light than the surroundings get, so the colours stay vivid.
  vec3 light = underLight(vW, n, 0.45);
  light = mix(light, vec3(dot(light, vec3(0.34))), 0.6) * 1.12;
  vec3 col = alb * light;
  // Fins let light through.
  col += alb * 0.3 * (1.0 - onBody);
  vec3 h = normalize(uSunU + view);
  col += vec3(0.5) * pow(max(dot(n, h), 0.0), 36.0) * onBody;
  col += S(0.55, 0.88, 1.0) * pow(1.0 - max(dot(n, view), 0.0), 3.0) * 0.2 * onBody;
  col += vec3(0.8) * glint;
  // Pectoral fins, and the pale tails of some species, are see-through.
  // With multisampling, alpha becomes partial coverage.
  float solid = 1.0;
  if (part > 3.5) solid = 0.3;
  if (part > 0.5 && part < 1.5 && (abs(uKind - 4.0) < 0.5 || uKind > 5.5 && uKind < 6.5)) {
    solid = 0.7;
  }
  gl_FragColor = vec4(applyFog(col, vW), solid);
}
`;

interface Fish {
  kind: number;
  x: number;
  y: number;
  z: number;
  h: number; // heading: 0 swims right, PI swims left
  pitch: number;
  roll: number;
  dir: number; // 1 right, -1 left
  cruise: number;
  boost: number;
  lane: number; // home distance from the camera
  home: number; // home depth
  bobRate: number;
  bobAmp: number;
  seed: number;
  phase: number;
  size: number;
  turnIn: number;
  shown: boolean;
  leader: Fish | null;
  ox: number;
  oy: number;
  oz: number;
  vx: number;
  vy: number;
  vz: number;
}

export function createFish() {
  const rand = rng(1234);
  const meshes: THREE.Mesh[] = [];
  const buffers: THREE.InstancedBufferAttribute[][] = [];
  const all: Fish[] = [];
  const byKind: Fish[][] = [];

  function spawn(kind: number, shown: boolean, leader: Fish | null): Fish {
    const spec = species[kind];
    return {
      kind,
      x: 0,
      y: -3,
      z: -6,
      h: 0,
      pitch: 0,
      roll: 0,
      dir: rand() < 0.5 ? 1 : -1,
      cruise: spec.speed * (0.8 + rand() * 0.4),
      boost: 0,
      lane: -(2.6 + Math.pow(rand(), 1.3) * (spec.school ? 9 : 11)),
      home: 0,
      bobRate: 0.15 + rand() * 0.3,
      bobAmp: 0.15 + rand() * 0.5,
      seed: rand() * 100,
      phase: rand() * 6.28,
      size: spec.size * (0.82 + rand() * 0.36),
      turnIn: 8 + rand() * 30,
      shown,
      leader,
      ox: (rand() * 2 - 1) * 1.3,
      oy: (rand() * 2 - 1) * 0.55,
      oz: (rand() * 2 - 1) * 0.7,
      vx: 0,
      vy: 0,
      vz: 0,
    };
  }

  for (let kind = 0; kind < species.length; kind++) {
    const spec = species[kind];
    const { geo: base, eye } = fishGeometry(spec.shape);
    const geo = new THREE.InstancedBufferGeometry();
    geo.setIndex(base.getIndex());
    for (const name of ["position", "normal", "aUv", "aFin"]) {
      geo.setAttribute(name, base.getAttribute(name));
    }
    const iPos = new THREE.InstancedBufferAttribute(
      new Float32Array(spec.count * 4),
      4,
    );
    const iDir = new THREE.InstancedBufferAttribute(
      new Float32Array(spec.count * 4),
      4,
    );
    const iAnim = new THREE.InstancedBufferAttribute(
      new Float32Array(spec.count * 2),
      2,
    );
    for (const attr of [iPos, iDir, iAnim])
      attr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("iPos", iPos);
    geo.setAttribute("iDir", iDir);
    geo.setAttribute("iAnim", iAnim);
    geo.instanceCount = spec.count;
    const mesh = new THREE.Mesh(
      geo,
      makeMaterial({
        vertexShader: fishVertex,
        fragmentShader: fishFragment,
        uniforms: {
          ...underUniforms(),
          uKind: { value: kind },
          uEye: { value: eye },
        },
        side: THREE.DoubleSide,
        alphaToCoverage: true,
      }),
    );
    mesh.frustumCulled = false;
    meshes.push(mesh);
    buffers.push([iPos, iDir, iAnim]);

    const list: Fish[] = [];
    if (spec.school) {
      for (let s = 0; s < spec.count / spec.school; s++) {
        const leader = spawn(kind, false, null);
        all.push(leader);
        for (let i = 0; i < spec.school; i++) {
          const fish = spawn(kind, true, leader);
          list.push(fish);
          all.push(fish);
        }
      }
    } else {
      for (let i = 0; i < spec.count; i++) {
        const fish = spawn(kind, true, null);
        list.push(fish);
        all.push(fish);
      }
    }
    byKind.push(list);
  }

  let placed = false;
  let lo = -10;
  let hi = -1;
  let halfPerMetre = 1;

  // Free swimmers and school leaders cruise across the view and re-enter
  // from the side once they have left it.
  function cruise(fish: Fish, view: View) {
    const dt = view.dt;
    const half = halfPerMetre * -fish.z + fish.size + 1.4;
    let jumpX = 0;
    let jumpY = 0;
    if (fish.x * fish.dir > half) {
      jumpX = -fish.dir * half - fish.x;
      const next = lo + rand() * (hi - lo);
      jumpY = next - fish.home;
      fish.turnIn = 8 + rand() * 30;
    }
    // Follow the camera down the page: wrap home depths into the band
    // around it, coming back in from the side.
    const span = hi - lo;
    if (span > 1 && (fish.home > hi || fish.home < lo)) {
      const next = lo + ((((fish.home - lo) % span) + span) % span);
      jumpY = next - fish.home;
      jumpX = -fish.dir * half - fish.x;
    } else if (span <= 1) {
      jumpY = (lo + hi) / 2 - fish.home;
    }
    if (jumpX || jumpY) {
      fish.x += jumpX;
      fish.y += jumpY;
      fish.home += jumpY;
      for (const other of all) {
        if (other.leader === fish) {
          other.x += jumpX;
          other.y += jumpY;
        }
      }
    }

    fish.turnIn -= dt;
    if (fish.turnIn < 0 && Math.abs(fish.x) < half * 0.6) {
      fish.dir = -fish.dir;
      fish.turnIn = 10 + rand() * 30;
    }
    const steer = Math.max(-0.5, Math.min(0.5, (fish.lane - fish.z) * 0.35));
    const want = fish.dir > 0 ? steer : Math.PI - steer;
    let diff = want - fish.h;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const rate = (1.3 + fish.boost * 1.5) * dt;
    const turned = Math.max(-rate, Math.min(rate, diff));
    fish.h += turned;
    fish.roll +=
      ((dt ? -turned / dt : 0) * 0.22 - fish.roll) * Math.min(1, dt * 4);
    const target =
      fish.home + Math.sin(view.time * fish.bobRate + fish.seed) * fish.bobAmp;
    const pitch = Math.max(-0.45, Math.min(0.45, (target - fish.y) * 0.7));
    fish.pitch += (pitch - fish.pitch) * Math.min(1, dt * 2);
    const speed = fish.cruise * (1 + fish.boost);
    fish.boost *= Math.exp(-dt * 1.1);
    const cp = Math.cos(fish.pitch);
    fish.vx = Math.cos(fish.h) * cp * speed;
    fish.vy = Math.sin(fish.pitch) * speed;
    fish.vz = Math.sin(fish.h) * cp * speed;
    fish.x += fish.vx * dt;
    fish.y += fish.vy * dt;
    fish.z += fish.vz * dt;
    fish.phase += dt * (5 + 11 * speed);
  }

  // School members chase a slot beside their leader.
  function follow(fish: Fish, view: View) {
    const dt = view.dt;
    const leader = fish.leader!;
    const c = Math.cos(leader.h);
    const s = Math.sin(leader.h);
    const wob = view.time * 0.6 + fish.seed;
    const tx = leader.x + c * fish.ox - s * fish.oz + Math.sin(wob) * 0.12;
    const ty = leader.y + fish.oy + Math.sin(wob * 1.3) * 0.1;
    const tz =
      leader.z + s * fish.ox + c * fish.oz + Math.cos(wob * 0.9) * 0.12;
    fish.vx += ((tx - fish.x) * 2.2 - (fish.vx - leader.vx) * 1.8) * dt;
    fish.vy += ((ty - fish.y) * 2.2 - (fish.vy - leader.vy) * 1.8) * dt;
    fish.vz += ((tz - fish.z) * 2.2 - (fish.vz - leader.vz) * 1.8) * dt;
    fish.x += fish.vx * dt;
    fish.y += fish.vy * dt;
    fish.z = Math.min(-1.2, fish.z + fish.vz * dt);
    const flat = Math.hypot(fish.vx, fish.vz);
    const speed = Math.hypot(flat, fish.vy);
    if (flat > 0.02) {
      let diff = Math.atan2(fish.vz, fish.vx) - fish.h;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      fish.h += diff * Math.min(1, dt * 5);
      fish.pitch = Math.atan2(fish.vy, flat) * 0.8;
    }
    fish.boost *= Math.exp(-dt * 1.1);
    fish.phase += dt * (6 + 12 * speed);
  }

  function update(view: View) {
    const { k, h, camY, floorY } = view;
    halfPerMetre = (view.w / 2) * k;
    // Depth band that fish live in: around the camera, between the seabed
    // and the surface.
    const reach = (h / 2) * k * 14 + 1.5;
    lo = Math.max(camY - reach, floorY + 0.9);
    hi = Math.min(camY + reach, -0.7);
    if (hi < lo) lo = hi = (lo + hi) / 2;

    if (!placed) {
      placed = true;
      for (const fish of all) {
        if (fish.leader) continue;
        fish.z = fish.lane;
        fish.x = (rand() * 2 - 1) * halfPerMetre * -fish.z;
        fish.home = lo + rand() * (hi - lo);
        fish.y = fish.home;
        fish.h = fish.dir > 0 ? 0 : Math.PI;
      }
      for (const fish of all) {
        if (!fish.leader) continue;
        fish.x = fish.leader.x + fish.ox;
        fish.y = fish.leader.y + fish.oy;
        fish.z = fish.leader.z + fish.oz;
        fish.h = fish.leader.h;
      }
    }
    if (view.dt) {
      for (const fish of all) if (!fish.leader) cruise(fish, view);
      for (const fish of all) if (fish.leader) follow(fish, view);
    } else {
      // Still picture (reduced motion): only keep the fish in the band of
      // water around the camera as the page scrolls.
      const span = hi - lo;
      for (const fish of all) {
        if (fish.leader || span <= 1) continue;
        if (fish.home <= hi && fish.home >= lo) continue;
        const next = lo + ((((fish.home - lo) % span) + span) % span);
        const jump = next - fish.home;
        fish.home = next;
        fish.y += jump;
        for (const other of all) if (other.leader === fish) other.y += jump;
      }
    }

    for (let kind = 0; kind < species.length; kind++) {
      const [iPos, iDir, iAnim] = buffers[kind];
      const list = byKind[kind];
      for (let i = 0; i < list.length; i++) {
        const fish = list[i];
        const cp = Math.cos(fish.pitch);
        iPos.setXYZW(i, fish.x, fish.y, fish.z, fish.size);
        iDir.setXYZW(
          i,
          Math.cos(fish.h) * cp,
          Math.sin(fish.pitch),
          Math.sin(fish.h) * cp,
          fish.roll,
        );
        iAnim.setXY(i, fish.phase, 0.75 + Math.min(1.2, fish.boost * 0.5));
      }
      iPos.needsUpdate = true;
      iDir.needsUpdate = true;
      iAnim.needsUpdate = true;
    }
  }

  // Scares fish near a point on screen (viewport px). Returns how many fled.
  function startle(
    view: View,
    px: number,
    py: number,
    radius: number,
    force: number,
  ) {
    let fled = 0;
    const { w, lvh, k, camX, camY } = view;
    for (const fish of all) {
      if (!fish.shown) continue;
      const sx = w / 2 + (fish.x - camX) / -fish.z / k;
      const sy = lvh / 2 - (fish.y - camY) / -fish.z / k;
      const dx = sx - px;
      const dy = sy - py;
      if (dx * dx + dy * dy > radius * radius) continue;
      if (fish.boost > force * 0.5) continue;
      fled++;
      const away = dx >= 0 ? 1 : -1;
      if (fish.leader) {
        fish.vx += away * force * 0.9;
        fish.vy += (dy >= 0 ? -1 : 1) * force * 0.3;
        fish.boost = force;
        fish.leader.boost = Math.max(fish.leader.boost, force * 0.6);
        fish.leader.dir = away;
      } else {
        fish.dir = away;
        fish.boost = force;
        fish.home += (dy >= 0 ? -1 : 1) * 0.5;
      }
    }
    return fled;
  }

  return { meshes, update, startle };
}
