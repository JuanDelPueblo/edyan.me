import * as THREE from "three";
import { common } from "./glsl";
import {
  fillAttribute,
  makeMaterial,
  mergeGeometries,
  rng,
  U,
  type View,
} from "./view";

// Distance haze shared by the land shaders.
const haze = /* glsl */ `
vec3 airHaze(vec3 col, vec3 wpos) {
  float d = length(wpos - cameraPosition);
  return mix(col, S(0.62, 0.88, 1.0), 1.0 - exp(-d * 0.0009));
}
`;

const landVertex = /* glsl */ `
varying vec3 vW;
varying vec3 vN;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normal;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const landFragment = /* glsl */ `
${common}
${haze}
uniform vec3 uLight;
varying vec3 vW;
varying vec3 vN;
void main() {
  vec3 n = normalize(vN);
  float nz = fbm(vW.xz * 0.22);
  float fine = fbm(vW.xz * 1.9);
  vec3 grass = mix(S(0.16, 0.56, 0.06), S(0.56, 0.88, 0.14), nz);
  grass *= 0.86 + 0.28 * fine;
  vec3 sand = mix(S(0.99, 0.94, 0.76), S(0.86, 0.76, 0.56),
    smoothstep(0.5, 0.0, vW.y));
  vec3 alb = mix(grass, sand, smoothstep(2.4, 1.0, vW.y + nz * 1.2));
  float ndl = clamp(dot(n, uLight) * 0.65 + 0.35, 0.0, 1.0);
  vec3 col = alb * (S(0.50, 0.70, 0.92) * 0.5 + S(1.0, 0.97, 0.84) * 1.1 * ndl);
  gl_FragColor = vec4(airHaze(col, vW), 1.0);
}
`;

// El Morro, the fort at the mouth of San Juan Bay, on the hill's spit.
const fortVertex = /* glsl */ `
attribute vec3 aInfo; // part, metres along the wall (or flag u), height 0..1
uniform float uTime;
varying vec3 vW;
varying vec3 vN;
varying vec3 vInfo;
void main() {
  vec3 p = position;
  // The flag ripples away from its pole.
  if (aInfo.x > 3.5) p.z += sin(uTime * 3.0 - aInfo.y * 5.0) * 0.3 * aInfo.y;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vW = w.xyz;
  vN = normal;
  vInfo = aInfo;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const fortFragment = /* glsl */ `
${common}
${haze}
uniform vec3 uLight;
varying vec3 vW;
varying vec3 vN;
varying vec3 vInfo;
void main() {
  float part = vInfo.x;
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 alb;
  if (part < 0.5) {
    // Weathered sandstone, stained towards the base, with a pale parapet
    // cut by gun ports.
    float nz = fbm(vec2(vInfo.y * 0.5, vInfo.z * 4.0));
    alb = mix(S(0.66, 0.52, 0.34), S(0.90, 0.78, 0.56), nz);
    alb *= 0.74 + 0.26 * smoothstep(0.0, 0.5, vInfo.z);
    alb = mix(alb, S(0.96, 0.88, 0.70), smoothstep(0.84, 0.88, vInfo.z));
    float port = step(0.8, vInfo.z) * step(fract(vInfo.y / 2.4), 0.26);
    alb = mix(alb, S(0.30, 0.22, 0.14), port);
  } else if (part < 1.5) {
    // Garita: pale plaster with a dark lookout slit.
    alb = S(0.95, 0.88, 0.72);
    alb = mix(alb, S(0.22, 0.16, 0.10),
      step(abs(vInfo.z - 0.62), 0.1) * step(fract(vInfo.y), 0.4));
  } else if (part < 2.5) {
    // Lighthouse: grey with white bands.
    alb = mix(S(0.56, 0.58, 0.60), S(0.97, 0.97, 0.95),
      step(abs(fract(vInfo.z * 2.0) - 0.5), 0.12));
  } else if (part < 3.5) {
    alb = S(0.10, 0.12, 0.16);
  } else {
    // Puerto Rico's flag: five stripes, a blue triangle and a white star.
    float t = vInfo.z;
    alb = mod(floor(t * 5.0), 2.0) < 0.5 ? S(0.90, 0.08, 0.12) : vec3(1.0);
    if (vInfo.y < 0.577 * (1.0 - 2.0 * abs(t - 0.5))) alb = S(0.02, 0.25, 0.74);
    alb = mix(alb, vec3(1.0),
      step(length(vec2((vInfo.y - 0.2) * 1.5, t - 0.5)), 0.12));
  }
  float ndl = clamp(dot(n, uLight) * 0.6 + 0.4, 0.0, 1.0);
  vec3 col = alb * (S(0.50, 0.70, 0.92) * 0.5 + S(1.0, 0.97, 0.84) * 1.15 * ndl);
  gl_FragColor = vec4(airHaze(col, vW), 1.0);
}
`;

const treeVertex = /* glsl */ `
attribute vec4 aInfo; // kind, shade, leaf u, leaf v
attribute vec4 iPos; // base position, height
attribute vec3 iVar; // turn, tint, sway phase
uniform float uTime;
varying vec3 vW;
varying vec3 vN;
varying vec3 vO;
varying vec4 vInfo;
varying float vTint;
void main() {
  vec3 p = position;
  float sway = sin(uTime * 1.1 + iVar.z) * 0.014
    + sin(uTime * 2.3 + iVar.z * 1.7 + p.y * 4.0) * 0.006;
  p.x += sway * p.y * p.y;
  if (aInfo.x > 1.5 && aInfo.x < 2.5) {
    p.y += sin(uTime * 1.6 + iVar.z + aInfo.w * 3.0) * 0.025 * aInfo.w;
  }
  float c = cos(iVar.x);
  float s = sin(iVar.x);
  vec3 q = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  vN = vec3(c * normal.x + s * normal.z, normal.y, -s * normal.x + c * normal.z);
  vW = iPos.xyz + q * iPos.w;
  vO = position;
  vInfo = aInfo;
  vTint = iVar.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}
`;

const treeFragment = /* glsl */ `
${common}
${haze}
uniform vec3 uLight;
uniform vec3 uSunDir;
varying vec3 vW;
varying vec3 vN;
varying vec3 vO;
varying vec4 vInfo;
varying float vTint;
void main() {
  float kind = vInfo.x;
  vec3 n = normalize(vN);
  vec3 view = normalize(cameraPosition - vW);
  vec3 alb;
  float leaf = 1.0;
  if (kind < 0.5) {
    alb = S(0.47, 0.33, 0.20) * (0.82 + 0.18 * sin(vInfo.w * 110.0));
    leaf = 0.0;
  } else if (kind < 1.5) {
    float nz = fbm(vO.xy * 13.0 + vO.z * 9.0);
    alb = mix(S(0.08, 0.42, 0.04), S(0.40, 0.80, 0.10), nz);
    alb = mix(alb, S(0.62, 0.88, 0.14), vTint * 0.45);
  } else if (kind < 2.5) {
    // Gaps between the leaflets of a palm frond.
    float gap = fract(vInfo.w * 15.0 - abs(vInfo.z) * 1.6);
    if (abs(vInfo.z) > 0.16 && gap > 0.66) discard;
    if (!gl_FrontFacing) n = -n;
    alb = mix(S(0.13, 0.50, 0.05), S(0.56, 0.88, 0.18), vInfo.w);
  } else {
    alb = S(0.36, 0.25, 0.12);
    leaf = 0.0;
  }
  float shade = vInfo.y;
  float ndl = clamp(dot(n, uLight) * 0.6 + 0.4, 0.0, 1.0);
  vec3 col = alb * shade
    * (S(0.50, 0.70, 0.92) * 0.55 + S(1.0, 0.97, 0.84) * 1.2 * ndl);
  // Leaves glow when the sun is behind them, and carry a soft gloss.
  col += leaf * alb * S(0.95, 1.0, 0.35)
    * pow(max(dot(-view, uSunDir), 0.0), 3.0) * 0.4;
  vec3 h = normalize(uLight + view);
  col += leaf * vec3(0.16) * pow(max(dot(n, h), 0.0), 16.0);
  gl_FragColor = vec4(airHaze(col, vW), 1.0);
}
`;

function bump(du: number, dv: number, su: number, sv: number) {
  return Math.exp(-((du * du) / (su * su) + (dv * dv) / (sv * sv)));
}

// Height in metres over the island's -1..1 footprint.
function hillHeight(u: number, v: number) {
  return (
    17 * bump(u + 0.25, v, 0.42, 0.62) +
    10 * bump(u - 0.38, v - 0.1, 0.3, 0.5) +
    3.4 * bump(u - 0.8, v, 0.24, 0.4) -
    1.3
  );
}
function cayHeight(u: number, v: number) {
  return 5.5 * bump(u, v, 0.5, 0.6) + 2.6 * bump(u - 0.52, v, 0.3, 0.4) - 1;
}

function islandGeometry(
  height: (u: number, v: number) => number,
  sizeX: number,
  sizeZ: number,
) {
  const geo = new THREE.PlaneGeometry(sizeX, sizeZ, 80, 40);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / (sizeX / 2);
    const v = pos.getZ(i) / (sizeZ / 2);
    pos.setY(i, height(u, v));
  }
  geo.computeVertexNormals();
  return geo;
}

// Where the fort stands on the hill: footprint position and the centre of
// its base in the hill's own metres.
const FORT_U = 0.82;
const FORT_V = 0.15;
// Scale of the fort, which is modelled about 21 m wide and 15 m tall. At
// this size its flag stays below the header's button.
const SIZE = 0.8;

// The fort in the hill's local metres. Parts: 0 wall, 1 garita,
// 2 lighthouse, 3 lantern and pole, 4 flag.
function fortGeometry(cx: number, cz: number) {
  const position: number[] = [];
  const normal: number[] = [];
  const info: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  // Corners run anticlockwise seen from outside; each carries its own
  // (along, height) pair.
  function quad(points: number[][], part: number, uv: number[][]) {
    a.set(
      points[1][0] - points[0][0],
      points[1][1] - points[0][1],
      points[1][2] - points[0][2],
    );
    b.set(
      points[3][0] - points[0][0],
      points[3][1] - points[0][1],
      points[3][2] - points[0][2],
    );
    a.cross(b).normalize();
    for (const i of [0, 1, 2, 0, 2, 3]) {
      position.push(
        points[i][0] * SIZE + cx,
        points[i][1] * SIZE,
        points[i][2] * SIZE + cz,
      );
      normal.push(a.x, a.y, a.z);
      info.push(part, uv[i][0], uv[i][1]);
    }
  }
  // A ring of quads between two polygons, with a flat top.
  function ring(
    x: number,
    z: number,
    y0: number,
    y1: number,
    bottom: number[][],
    top: number[][],
    part: number,
  ) {
    let along = 0;
    const count = bottom.length;
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count;
      const length = Math.hypot(top[j][0] - top[i][0], top[j][1] - top[i][1]);
      quad(
        [
          [x + bottom[i][0], y0, z + bottom[i][1]],
          [x + bottom[j][0], y0, z + bottom[j][1]],
          [x + top[j][0], y1, z + top[j][1]],
          [x + top[i][0], y1, z + top[i][1]],
        ],
        part,
        [
          [along, 0],
          [along + length, 0],
          [along + length, 1],
          [along, 1],
        ],
      );
      along += length;
    }
    for (let i = 1; i < count - 1; i++) {
      quad(
        [
          [x + top[0][0], y1, z + top[0][1]],
          [x + top[i][0], y1, z + top[i][1]],
          [x + top[i + 1][0], y1, z + top[i + 1][1]],
          [x + top[i + 1][0], y1, z + top[i + 1][1]],
        ],
        part,
        [
          [0, 0.5],
          [0, 0.5],
          [0, 0.5],
          [0, 0.5],
        ],
      );
    }
  }
  // A wall block whose sides lean in: wider at the base by the batter.
  function block(
    x: number,
    z: number,
    width: number,
    depth: number,
    y0: number,
    y1: number,
    batter: number,
  ) {
    function corners(w: number, d: number) {
      return [
        [-w / 2, d / 2],
        [w / 2, d / 2],
        [w / 2, -d / 2],
        [-w / 2, -d / 2],
      ];
    }
    ring(
      x,
      z,
      y0,
      y1,
      corners(width + 2 * batter, depth + 2 * batter),
      corners(width, depth),
      0,
    );
  }
  // A round tower that tapers from r0 to r1.
  function tower(
    x: number,
    z: number,
    r0: number,
    r1: number,
    y0: number,
    y1: number,
    part: number,
  ) {
    function circle(r: number) {
      const points: number[][] = [];
      for (let i = 0; i < 8; i++) {
        const turn = -(i / 8) * Math.PI * 2;
        points.push([Math.cos(turn) * r, Math.sin(turn) * r]);
      }
      return points;
    }
    ring(x, z, y0, y1, circle(r0), circle(r1), part);
  }
  // A sentry box with a domed roof, hung on a wall corner.
  function garita(x: number, y: number, z: number) {
    tower(x, z, 0.5, 0.85, y - 1.3, y - 0.4, 1);
    tower(x, z, 0.85, 0.85, y - 0.4, y + 1.5, 1);
    tower(x, z, 0.95, 0.55, y + 1.5, y + 2.0, 1);
    tower(x, z, 0.55, 0.12, y + 2.0, y + 2.5, 1);
  }

  // Three tiers of walls stepping up and back from the sea.
  block(0, 0, 21, 11, -0.5, 6.2, 1.7);
  block(-2.5, -0.8, 13.5, 7.5, 6.2, 9.4, 0.6);
  block(-5, -1.2, 6.5, 5, 9.4, 11.4, 0.3);
  garita(10.6, 6.2, 5.6);
  garita(-10.6, 6.2, 5.6);
  garita(4.3, 9.4, 3);
  // Lighthouse: shaft, gallery, lantern and cap.
  tower(2.3, -1.5, 1.15, 0.9, 9.4, 13, 2);
  tower(2.3, -1.5, 1.25, 1.25, 13, 13.3, 3);
  tower(2.3, -1.5, 0.7, 0.7, 13.3, 14.3, 3);
  tower(2.3, -1.5, 0.9, 0.1, 14.3, 14.9, 3);
  // Flag on the top tier.
  tower(-6, -1.2, 0.12, 0.1, 11.4, 14.7, 3);
  quad(
    [
      [-5.9, 12.9, -1.2],
      [-3.2, 12.9, -1.2],
      [-3.2, 14.7, -1.2],
      [-5.9, 14.7, -1.2],
    ],
    4,
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  );

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
  geo.setAttribute("aInfo", new THREE.Float32BufferAttribute(info, 3));
  return geo;
}

// Round-crowned tree, one unit tall: a trunk under overlapping leaf balls.
function broadleafGeometry() {
  const rand = rng(5);
  const parts: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(0.03, 0.055, 0.5, 6).toNonIndexed();
  trunk.translate(0, 0.25, 0);
  fillAttribute(trunk, "aInfo", [0, 0.9, 0, 0]);
  parts.push(trunk);

  const crown = new THREE.Vector3(0, 0.66, 0);
  const balls = [[0, 0.68, 0, 0.27]];
  balls.push([0.02, 0.87, 0, 0.19]);
  for (let i = 0; i < 6; i++) {
    const turn = (i / 6) * Math.PI * 2 + rand();
    balls.push([
      Math.cos(turn) * 0.2,
      0.55 + rand() * 0.2,
      Math.sin(turn) * 0.2,
      0.17 + rand() * 0.07,
    ]);
  }
  const p = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (const [x, y, z, radius] of balls) {
    const ball = new THREE.IcosahedronGeometry(radius, 1);
    ball.translate(x, y, z);
    const pos = ball.getAttribute("position");
    const nrm = ball.getAttribute("normal");
    const info = new Float32Array(pos.count * 4);
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      // Blend the ball's normal with the crown's so the crown shades as one.
      a.set(p.x - x, p.y - y, p.z - z).normalize();
      b.copy(p).sub(crown);
      const reach = b.length();
      b.normalize();
      a.multiplyScalar(0.55).addScaledVector(b, 0.6).normalize();
      nrm.setXYZ(i, a.x, a.y, a.z);
      const lump =
        1 + 0.07 * Math.sin(p.x * 31 + p.y * 17) * Math.cos(p.z * 29);
      pos.setXYZ(
        i,
        x + (p.x - x) * lump,
        y + (p.y - y) * lump,
        z + (p.z - z) * lump,
      );
      const inner = Math.min(1, Math.max(0.35, reach / 0.36));
      const low = Math.min(1, Math.max(0.55, (p.y - 0.36) / 0.36));
      info.set([1, inner * low, 0, 0], i * 4);
    }
    ball.setAttribute("aInfo", new THREE.BufferAttribute(info, 4));
    parts.push(ball);
  }
  return mergeGeometries(parts, ["position", "normal", "aInfo"]);
}

// Palm, one unit tall: a leaning trunk, arching fronds and coconuts.
function palmGeometry() {
  const rand = rng(9);
  const position: number[] = [];
  const normal: number[] = [];
  const info: number[] = [];
  function push(p: THREE.Vector3, n: THREE.Vector3, i: number[]) {
    position.push(p.x, p.y, p.z);
    normal.push(n.x, n.y, n.z);
    info.push(i[0], i[1], i[2], i[3]);
  }

  const lean = 0.2;
  const rings = 10;
  const sides = 7;
  function trunkPoint(
    t: number,
    side: number,
    out: THREE.Vector3,
    n: THREE.Vector3,
  ) {
    const radius = 0.03 - 0.011 * t + 0.016 * Math.exp(-t * 9);
    const turn = (side / sides) * Math.PI * 2;
    n.set(Math.cos(turn), 0, Math.sin(turn));
    out.set(lean * t * t + n.x * radius, t, n.z * radius);
  }
  const p = [0, 1, 2, 3].map(() => new THREE.Vector3());
  const n = [0, 1, 2, 3].map(() => new THREE.Vector3());
  for (let ring = 0; ring < rings; ring++) {
    const t0 = ring / rings;
    const t1 = (ring + 1) / rings;
    for (let side = 0; side < sides; side++) {
      trunkPoint(t0, side, p[0], n[0]);
      trunkPoint(t0, side + 1, p[1], n[1]);
      trunkPoint(t1, side + 1, p[2], n[2]);
      trunkPoint(t1, side, p[3], n[3]);
      for (const c of [0, 2, 1, 0, 3, 2]) {
        push(p[c], n[c], [0, 1, 0, c < 2 ? t0 : t1]);
      }
    }
  }

  const top = new THREE.Vector3(lean, 1, 0);
  const up = new THREE.Vector3(0, 1, 0);
  const fronds = 13;
  const steps = 9;
  const dir = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const face = new THREE.Vector3();
  for (let f = 0; f < fronds; f++) {
    const turn = (f / fronds) * Math.PI * 2 + rand() * 0.4;
    dir.set(Math.cos(turn), 0, Math.sin(turn));
    const length = 0.42 + rand() * 0.14;
    const rise = f % 3 === 0 ? 1.05 : 0.55 + rand() * 0.25;
    const droop = f % 3 === 0 ? 1.0 : 1.15 + rand() * 0.4;
    const rows: THREE.Vector3[][] = [];
    const faces: THREE.Vector3[] = [];
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const mid = top
        .clone()
        .addScaledVector(dir, length * t * 0.95)
        .addScaledVector(up, length * (rise * t - droop * t * t));
      tangent
        .copy(dir)
        .multiplyScalar(0.95)
        .addScaledVector(up, rise - 2 * droop * t)
        .normalize();
      side.crossVectors(tangent, up).normalize();
      face.crossVectors(side, tangent).normalize();
      const half = 0.075 * Math.pow(Math.sin(Math.PI * (0.06 + 0.94 * t)), 0.7);
      const sag = half * 0.45;
      rows.push([
        mid.clone().addScaledVector(side, -half).addScaledVector(face, -sag),
        mid,
        mid.clone().addScaledVector(side, half).addScaledVector(face, -sag),
      ]);
      faces.push(face.clone());
    }
    for (let s = 0; s < steps; s++) {
      for (let h = 0; h < 2; h++) {
        const corners = [
          [s, h],
          [s, h + 1],
          [s + 1, h + 1],
          [s, h],
          [s + 1, h + 1],
          [s + 1, h],
        ];
        for (const [row, col] of corners) {
          push(rows[row][col], faces[row], [2, 1, col - 1, row / steps]);
        }
      }
    }
  }

  const palm = new THREE.BufferGeometry();
  palm.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  palm.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
  palm.setAttribute("aInfo", new THREE.Float32BufferAttribute(info, 4));
  const parts = [palm];
  for (let i = 0; i < 3; i++) {
    const nut = new THREE.IcosahedronGeometry(0.03, 1);
    const turn = i * 2.1;
    nut.translate(lean + Math.cos(turn) * 0.035, 0.97, Math.sin(turn) * 0.035);
    fillAttribute(nut, "aInfo", [3, 1, 0, 0]);
    parts.push(nut);
  }
  return mergeGeometries(parts, ["position", "normal", "aInfo"]);
}

function treeMesh(base: THREE.BufferGeometry) {
  const geo = new THREE.InstancedBufferGeometry();
  for (const name of ["position", "normal", "aInfo"]) {
    geo.setAttribute(name, base.getAttribute(name));
  }
  const mesh = new THREE.Mesh(
    geo,
    makeMaterial({
      vertexShader: treeVertex,
      fragmentShader: treeFragment,
      uniforms: { uTime: U.uTime, uLight: U.uLight, uSunDir: U.uSunDir },
      side: THREE.DoubleSide,
    }),
  );
  mesh.frustumCulled = false;
  return mesh;
}

function setTrees(mesh: THREE.Mesh, trees: number[][]) {
  const geo = mesh.geometry as THREE.InstancedBufferGeometry;
  const iPos = new Float32Array(trees.length * 4);
  const iVar = new Float32Array(trees.length * 3);
  for (let i = 0; i < trees.length; i++) {
    iPos.set(trees[i].slice(0, 4), i * 4);
    iVar.set(trees[i].slice(4, 7), i * 3);
  }
  // Frees the GPU buffers of the previous layout; three.js uploads the
  // shared ones again on the next draw.
  geo.dispose();
  geo.setAttribute("iPos", new THREE.InstancedBufferAttribute(iPos, 4));
  geo.setAttribute("iVar", new THREE.InstancedBufferAttribute(iVar, 3));
  geo.instanceCount = trees.length;
}

export function createIslands() {
  const landMaterial = makeMaterial({
    vertexShader: landVertex,
    fragmentShader: landFragment,
    uniforms: { uLight: U.uLight },
  });
  const hillSize = [150, 70];
  const caySize = [100, 46];
  const hill = new THREE.Mesh(
    islandGeometry(hillHeight, hillSize[0], hillSize[1]),
    landMaterial,
  );
  const cay = new THREE.Mesh(
    islandGeometry(cayHeight, caySize[0], caySize[1]),
    landMaterial,
  );
  hill.frustumCulled = false;
  cay.frustumCulled = false;
  // The fort is the hill's child, so it moves and scales with it.
  const fortX = (FORT_U * hillSize[0]) / 2;
  const fortZ = (FORT_V * hillSize[1]) / 2;
  const fort = new THREE.Mesh(
    fortGeometry(fortX, fortZ),
    makeMaterial({
      vertexShader: fortVertex,
      fragmentShader: fortFragment,
      uniforms: { uLight: U.uLight, uTime: U.uTime },
      side: THREE.DoubleSide,
    }),
  );
  fort.frustumCulled = false;
  hill.add(fort);
  // World position of the middle of the fort and its radius, for clicks.
  const fortAt = new THREE.Vector3();
  let fortRadius = 1;
  const broadleaf = treeMesh(broadleafGeometry());
  const palms = treeMesh(palmGeometry());

  function layout(view: View) {
    const { w, hz, k, left } = view;
    const leaves: number[][] = [];
    const fronds: number[][] = [];
    const rand = rng(21);

    // The hill sits in the left margin; its size follows the page width.
    const hillDist = 190;
    // Sized to the sky band: the hill rises to about 0.42 of the height
    // between the horizon and the top of the page, and no wider than a
    // little over half the page.
    const hillScale = Math.min(
      (0.42 * hz * k * hillDist) / 17,
      (Math.max(420, w * 0.56) * k * hillDist) / 150,
    );
    const hillX = (Math.max(left * 0.6, 44) - w / 2) * k * hillDist;
    hill.position.set(hillX, 0, -hillDist);
    hill.scale.setScalar(hillScale);
    fortAt.set(fortX, 6.5, fortZ).multiplyScalar(hillScale).add(hill.position);
    fortRadius = 10 * hillScale;

    // The cay sits further out on the right, under the sun.
    const cayDist = 380;
    const cayScale = Math.min(
      (0.2 * hz * k * cayDist) / 14,
      Math.max(0.6, w / 1300),
      1.5,
    );
    const cayX = (w - Math.max(left * 0.5, 36) - w / 2) * k * cayDist;
    cay.position.set(cayX, 0, -cayDist);
    cay.scale.setScalar(cayScale);

    function plant(
      list: number[][],
      island: THREE.Mesh,
      size: number[],
      height: (u: number, v: number) => number,
      u: number,
      v: number,
      tall: number,
    ) {
      const s = island.scale.x;
      list.push([
        island.position.x + u * (size[0] / 2) * s,
        (height(u, v) - 0.3) * s,
        island.position.z + v * (size[1] / 2) * s,
        tall * s,
        rand() * 6.28,
        rand(),
        rand() * 6.28,
      ]);
    }

    let tries = 0;
    while (leaves.length < 22 && tries++ < 600) {
      const u = rand() * 1.5 - 0.8;
      const v = rand() * 1.1 - 0.6;
      if (hillHeight(u, v) < 3.2) continue;
      plant(leaves, hill, hillSize, hillHeight, u, v, 7 + rand() * 5);
    }
    tries = 0;
    while (fronds.length < 7 && tries++ < 600) {
      const u = rand() * 1.9 - 0.95;
      const v = 0.1 + rand() * 0.75;
      const h = hillHeight(u, v);
      if (h < 0.6 || h > 2.6) continue;
      plant(fronds, hill, hillSize, hillHeight, u, v, 10 + rand() * 5);
    }
    tries = 0;
    while (fronds.length < 15 && tries++ < 600) {
      const u = rand() * 1.6 - 0.8;
      const v = rand() * 1.2 - 0.6;
      if (cayHeight(u, v) < 0.8) continue;
      plant(fronds, cay, caySize, cayHeight, u, v, 11 + rand() * 6);
    }
    // No trees where the fort stands. Removing them afterwards leaves the
    // rest of the planting as it was.
    function clearOfFort(tree: number[]) {
      const u = (tree[0] - hill.position.x) / hill.scale.x / (hillSize[0] / 2);
      return Math.abs(u - FORT_U) > 0.2;
    }
    setTrees(broadleaf, leaves.filter(clearOfFort));
    setTrees(palms, fronds.filter(clearOfFort));
  }

  // Whether a point on the page, in px from the canvas's top left corner,
  // is on the fort as the given camera sees it.
  const seen = new THREE.Vector3();
  function onFort(camera: THREE.Camera, x: number, y: number, view: View) {
    seen.copy(fortAt).project(camera);
    const reach = Math.max(22, fortRadius / (-fortAt.z * view.k));
    return (
      Math.hypot(
        (seen.x * 0.5 + 0.5) * view.w - x,
        (0.5 - seen.y * 0.5) * view.h - y,
      ) < reach
    );
  }

  return { hill, cay, broadleaf, palms, layout, onFort };
}
