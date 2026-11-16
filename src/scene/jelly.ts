import * as THREE from "three";
import { common, underwater } from "./glsl";
import { underUniforms } from "./under";
import { makeMaterial, rng, type View } from "./view";

const jellyVertex = /* glsl */ `
${common}
${underwater}
attribute vec3 aJ; // distance from the crown or along the tentacle, kind, phase
attribute vec4 iPos; // position, size
attribute vec2 iLook; // pulse phase, colour
varying vec3 vW;
varying vec3 vN;
varying vec3 vJ;
varying float vLook;
void main() {
  vec3 p = position;
  float beat = uTime * 1.5 + iLook.x;
  if (aJ.y < 0.5) {
    // The bell squeezes in from the rim, a little later towards the edge.
    float squeeze = 0.5 + 0.5 * sin(beat - aJ.x * 1.6);
    p.xz *= 1.0 - 0.24 * squeeze * aJ.x;
    p.y *= 1.0 + 0.12 * squeeze;
  } else {
    // Arms and tentacles trail behind, waving.
    float squeeze = 0.5 + 0.5 * sin(beat - 1.6);
    p.xz *= 1.0 - 0.24 * squeeze * (1.0 - aJ.x * 0.6);
    float wave = beat * 0.8 - aJ.x * 5.0 + aJ.z;
    p.x += sin(wave) * 0.16 * aJ.x;
    p.z += cos(wave * 0.9) * 0.16 * aJ.x;
    p.y -= 0.12 * sin(beat - 2.4) * aJ.x;
  }
  vW = iPos.xyz + p * iPos.w;
  vN = normal;
  vJ = aJ;
  vLook = iLook.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}
`;

// Jellyfish are see-through: faint face-on, brighter at grazing angles.
const jellyFragment = /* glsl */ `
${common}
${underwater}
varying vec3 vW;
varying vec3 vN;
varying vec3 vJ;
varying float vLook;
void main() {
  vec3 ray = vW - cameraPosition;
  float dist = length(ray);
  vec3 view = -ray / dist;
  vec3 n = normalize(vN);
  vec3 tint = mix(S(1.0, 0.62, 0.90), S(0.62, 0.80, 1.0), vLook);
  vec3 col;
  float a;
  if (vJ.y < 0.5) {
    float rim = pow(1.0 - abs(dot(n, view)), 1.6);
    a = 0.16 + 0.62 * rim + 0.3 * smoothstep(0.86, 1.0, vJ.x);
    col = mix(tint, vec3(1.0), 0.35 + 0.4 * rim) * (0.8 + 0.5 * rim);
    // Bright veins fanning out from the crown.
    float veins = pow(abs(sin(atan(vN.z, vN.x) * 8.0)), 10.0) * smoothstep(0.25, 0.9, vJ.x);
    col += tint * veins * 0.35;
    a += veins * 0.12;
  } else if (vJ.y < 1.5) {
    a = 0.5 * (1.0 - vJ.x * 0.6);
    col = mix(tint, vec3(1.0), 0.5);
  } else {
    a = 0.42 * (1.0 - vJ.x * 0.8);
    col = mix(tint, vec3(1.0), 0.2);
  }
  col *= 0.6 + 0.6 * exp(vW.y * 0.04);
  float fog = exp(-dist * 0.048);
  col = mix(waterColor(-view), col, fog);
  a *= 0.35 + 0.65 * fog;
  gl_FragColor = vec4(col * a, a);
}
`;

// One jellyfish with a bell of radius 1.
function jellyGeometry() {
  const rand = rng(61);
  const position: number[] = [];
  const normal: number[] = [];
  const info: number[] = [];
  const index: number[] = [];
  function vertex(p: number[], n: number[], j: number[]) {
    position.push(p[0], p[1], p[2]);
    normal.push(n[0], n[1], n[2]);
    info.push(j[0], j[1], j[2]);
    return position.length / 3 - 1;
  }

  const rings = 12;
  const sides = 20;
  for (let i = 0; i <= rings; i++) {
    const a = i / rings;
    const angle = (a * Math.PI) / 2;
    const radius = Math.pow(Math.sin(angle), 0.85);
    // Scalloped rim.
    for (let j = 0; j <= sides; j++) {
      const turn = (j / sides) * Math.PI * 2;
      const wavy = 1 + 0.05 * a * a * Math.cos(turn * 10);
      const x = Math.cos(turn) * radius * wavy;
      const z = Math.sin(turn) * radius * wavy;
      const y = 0.72 * Math.cos(angle);
      vertex(
        [x, y, z],
        [
          Math.cos(turn) * Math.sin(angle),
          Math.cos(angle),
          Math.sin(turn) * Math.sin(angle),
        ],
        [a, 0, 0],
      );
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j;
      const b = a + sides + 1;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  // A ribbon hanging from (x, z), twisting as it goes down.
  function ribbon(
    x: number,
    z: number,
    length: number,
    width: number,
    kind: number,
    steps: number,
  ) {
    const phase = rand() * 6.28;
    const first = position.length / 3;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const twist = phase + t * (kind === 1 ? 5 : 2);
      const half =
        width * (1 - t * 0.7) * (kind === 1 ? 1 + 0.3 * Math.sin(t * 20) : 1);
      const dx = Math.cos(twist) * half;
      const dz = Math.sin(twist) * half;
      const y = -t * length;
      vertex([x - dx, y, z - dz], [-dz, 0, dx], [t, kind, phase]);
      vertex([x + dx, y, z + dz], [-dz, 0, dx], [t, kind, phase]);
    }
    for (let s = 0; s < steps; s++) {
      const a = first + s * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  for (let i = 0; i < 4; i++) {
    const turn = (i / 4) * Math.PI * 2 + 0.4;
    ribbon(
      Math.cos(turn) * 0.16,
      Math.sin(turn) * 0.16,
      1.5 + rand() * 0.5,
      0.14,
      1,
      14,
    );
  }
  for (let i = 0; i < 14; i++) {
    const turn = (i / 14) * Math.PI * 2;
    ribbon(
      Math.cos(turn) * 0.94,
      Math.sin(turn) * 0.94,
      2.4 + rand() * 1.6,
      0.022,
      2,
      14,
    );
  }

  const geo = new THREE.InstancedBufferGeometry();
  geo.setIndex(index);
  geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
  geo.setAttribute("aJ", new THREE.Float32BufferAttribute(info, 3));
  return geo;
}

const COUNT = 7;

export function createJellies() {
  const rand = rng(909);
  const geo = jellyGeometry();
  const iPos = new THREE.InstancedBufferAttribute(
    new Float32Array(COUNT * 4),
    4,
  );
  const iLook = new THREE.InstancedBufferAttribute(
    new Float32Array(COUNT * 2),
    2,
  );
  iPos.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("iPos", iPos);
  geo.setAttribute("iLook", iLook);
  geo.instanceCount = COUNT;
  const mesh = new THREE.Mesh(
    geo,
    makeMaterial({
      vertexShader: jellyVertex,
      fragmentShader: jellyFragment,
      uniforms: underUniforms(),
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    }),
  );
  mesh.frustumCulled = false;
  mesh.renderOrder = 15;

  // Per jellyfish: x, y, z, size, drift along x, rise speed.
  const state: number[][] = [];
  for (let i = 0; i < COUNT; i++) {
    state.push([0, 0, -(4.5 + rand() * 11), 0.16 + rand() * 0.2, 0, 0]);
    iLook.setXY(i, rand() * 6.28, rand());
  }
  let placed = false;

  function update(view: View) {
    const { k, w, h, camY, floorY, dt } = view;
    for (let i = 0; i < COUNT; i++) {
      const jelly = state[i];
      const half = (w / 2) * k * -jelly[2] + 2;
      const reach = (h / 2) * k * -jelly[2] + 2.5;
      const lo = Math.max(camY - reach, floorY + 2.5);
      const hi = Math.min(camY + reach, -1.6);
      if (!placed) {
        jelly[0] = (rand() * 2 - 1) * half;
        jelly[1] = lo + rand() * Math.max(0, hi - lo);
        jelly[4] = (rand() - 0.5) * 0.08;
        jelly[5] = 0.04 + rand() * 0.05;
      }
      // Rise in time with the pulse, then start again from below.
      const beat = Math.sin((view.time + 20) * 1.5 + iLook.getX(i) - 2.2);
      jelly[0] += jelly[4] * dt;
      jelly[1] += jelly[5] * (1 + 0.9 * beat) * dt;
      // Stay in the band of water around the camera as the page scrolls.
      if (jelly[1] > hi || jelly[1] < lo - 0.5) {
        const below = jelly[1] < lo;
        jelly[1] = hi <= lo ? (lo + hi) / 2 : below ? hi - rand() : lo;
        jelly[0] = (rand() * 2 - 1) * half;
      }
      if (Math.abs(jelly[0]) > half) jelly[0] = -Math.sign(jelly[0]) * half;
      iPos.setXYZW(i, jelly[0], jelly[1], jelly[2], jelly[3]);
    }
    placed = true;
    iPos.needsUpdate = true;
  }

  return { mesh, update };
}
