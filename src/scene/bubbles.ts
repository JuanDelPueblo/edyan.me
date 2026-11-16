import * as THREE from "three";
import { common, underwater } from "./glsl";
import { underUniforms } from "./under";
import { D_REF, makeMaterial, rng, type View } from "./view";

const quadCorners = new Float32Array([
  -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0,
]);

// Streams of bubbles that rise from the seabed to the surface and repeat.
const streamVertex = /* glsl */ `
${common}
${underwater}
attribute vec4 iB; // x, z, radius, phase
attribute vec3 iC; // speed, wobble width, wobble rate
varying vec2 vUv;
varying float vFade;
void main() {
  float range = max(-uFloorY - 0.3, 0.5);
  float f = fract(uTime * iC.x / range + iB.w);
  float wob = uTime * iC.z + iB.w * 50.0;
  vec3 center = vec3(
    iB.x + sin(wob) * iC.y * (0.3 + f),
    uFloorY + 0.15 + f * range,
    iB.y + cos(wob * 0.8) * iC.y * (0.3 + f)
  );
  vec4 mv = viewMatrix * vec4(center, 1.0);
  float radius = iB.z * (0.55 + 0.75 * f);
  mv.xy += position.xy * radius;
  vUv = position.xy;
  float d = length(mv.xyz);
  vFade = smoothstep(0.0, 0.04, f) * smoothstep(1.0, 0.985, f) * exp(-d * 0.045);
  gl_Position = projectionMatrix * mv;
}
`;

// Bubbles released by a click. Their positions come from the script.
const burstVertex = /* glsl */ `
attribute vec4 iB; // position, radius
attribute float iAge; // 0..1, hidden at 1
varying vec2 vUv;
varying float vFade;
void main() {
  vec4 mv = viewMatrix * vec4(iB.xyz, 1.0);
  mv.xy += position.xy * iB.w;
  vUv = position.xy;
  vFade = smoothstep(0.0, 0.05, iAge) * smoothstep(1.0, 0.7, iAge);
  gl_Position = projectionMatrix * mv;
}
`;

// A glassy ball: bright rim, clear middle, one crisp highlight.
const bubbleFragment = /* glsl */ `
${common}
varying vec2 vUv;
varying float vFade;
void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  float rim = smoothstep(0.5, 1.0, r);
  float edge = smoothstep(1.0, 0.9, r);
  vec3 col = S(0.72, 0.95, 1.0) * (0.12 + rim);
  float a = (0.07 + rim * 0.7) * edge;
  float shine = smoothstep(0.27, 0.1, distance(vUv, vec2(-0.36, 0.42)));
  float glow = smoothstep(0.2, 0.04, distance(vUv, vec2(0.38, -0.44)));
  col += vec3(1.8) * shine + vec3(0.7) * glow;
  a = max(a, max(shine, glow * 0.5));
  a *= vFade;
  gl_FragColor = vec4(col * a, a);
}
`;

// Specks drifting in the water, wrapped into a box around the camera.
const moteVertex = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uScale;
varying float vFade;
void main() {
  vec3 box = vec3(30.0, 12.0, 18.0);
  vec3 p = aSeed.xyz * box;
  p += vec3(0.07, 0.03, 0.02) * uTime * (0.5 + aSeed.w);
  p.x += sin(uTime * 0.3 + aSeed.w * 40.0) * 0.15;
  vec3 rel = mod(p - cameraPosition + box * 0.5, box) - box * 0.5;
  rel.z = -mod(p.z, box.z) - 0.4;
  vec4 mv = viewMatrix * vec4(cameraPosition + rel, 1.0);
  float d = -mv.z;
  gl_PointSize = max(1.0, (0.012 + 0.02 * aSeed.w) * uScale / d);
  vFade = smoothstep(0.4, 1.5, d) * exp(-d * 0.11) * (0.5 + 0.5 * aSeed.w);
  gl_Position = projectionMatrix * mv;
}
`;

const moteFragment = /* glsl */ `
varying float vFade;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.2, r) * vFade * 0.5;
  gl_FragColor = vec4(vec3(0.85, 1.0, 1.0) * a, a);
}
`;

const BURST = 60;

export function createBubbles() {
  const blending = {
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  };

  const streamGeo = new THREE.InstancedBufferGeometry();
  streamGeo.setAttribute("position", new THREE.BufferAttribute(quadCorners, 3));
  const streams = new THREE.Mesh(
    streamGeo,
    makeMaterial({
      vertexShader: streamVertex,
      fragmentShader: bubbleFragment,
      uniforms: underUniforms(),
      ...blending,
    }),
  );
  streams.frustumCulled = false;
  streams.renderOrder = 20;

  const burstGeo = new THREE.InstancedBufferGeometry();
  burstGeo.setAttribute("position", new THREE.BufferAttribute(quadCorners, 3));
  const burstB = new THREE.InstancedBufferAttribute(
    new Float32Array(BURST * 4),
    4,
  );
  const burstAge = new THREE.InstancedBufferAttribute(
    new Float32Array(BURST).fill(1),
    1,
  );
  burstB.setUsage(THREE.DynamicDrawUsage);
  burstAge.setUsage(THREE.DynamicDrawUsage);
  burstGeo.setAttribute("iB", burstB);
  burstGeo.setAttribute("iAge", burstAge);
  burstGeo.instanceCount = BURST;
  const burst = new THREE.Mesh(
    burstGeo,
    makeMaterial({
      vertexShader: burstVertex,
      fragmentShader: bubbleFragment,
      ...blending,
    }),
  );
  burst.frustumCulled = false;
  burst.renderOrder = 21;
  // Per bubble: rise speed, wobble phase, life in seconds, start x, start z.
  const burstState = new Float32Array(BURST * 5);
  let nextBurst = 0;

  const moteCount = 700;
  const seeds = new Float32Array(moteCount * 4);
  const moteRand = rng(8);
  for (let i = 0; i < seeds.length; i++) seeds[i] = moteRand();
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(moteCount * 3), 3),
  );
  moteGeo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
  const moteUniforms = {
    uTime: underUniforms().uTime,
    uScale: { value: 1000 },
  };
  const motes = new THREE.Points(
    moteGeo,
    makeMaterial({
      vertexShader: moteVertex,
      fragmentShader: moteFragment,
      uniforms: moteUniforms,
      ...blending,
    }),
  );
  motes.frustumCulled = false;
  motes.renderOrder = 19;

  function layout(view: View) {
    const { w, mpp, k, pr } = view;
    moteUniforms.uScale.value = pr / k;
    const rand = rng(515);
    const rows: number[][] = [];
    // Vents: tight columns of bubbles from one spot on the seabed.
    const vents = Math.max(5, Math.round(w / 240));
    for (let v = 0; v < vents; v++) {
      const z = -(3 + rand() * 14);
      const half = ((w / 2) * mpp * -z) / D_REF;
      const x = (rand() * 2 - 1) * half;
      const speed = 0.7 + rand() * 0.5;
      for (let i = 0; i < 16; i++) {
        rows.push([
          x + (rand() - 0.5) * 0.15,
          z + (rand() - 0.5) * 0.15,
          0.012 + rand() * rand() * 0.05,
          rand(),
          speed * (0.8 + rand() * 0.4),
          0.05 + rand() * 0.12,
          1.5 + rand() * 2,
        ]);
      }
    }
    // Stray bubbles everywhere else.
    for (let i = 0; i < 90; i++) {
      const z = -(1.6 + rand() * 16);
      const half = ((w / 2 + 100) * mpp * -z) / D_REF;
      rows.push([
        (rand() * 2 - 1) * half,
        z,
        0.008 + rand() * rand() * 0.04,
        rand(),
        0.35 + rand() * 0.5,
        0.05 + rand() * 0.2,
        1 + rand() * 2,
      ]);
    }
    const iB = new Float32Array(rows.length * 4);
    const iC = new Float32Array(rows.length * 3);
    for (let i = 0; i < rows.length; i++) {
      iB.set(rows[i].slice(0, 4), i * 4);
      iC.set(rows[i].slice(4, 7), i * 3);
    }
    // Frees the GPU buffers of the previous layout; three.js uploads the
    // shared ones again on the next draw.
    streamGeo.dispose();
    streamGeo.setAttribute("iB", new THREE.InstancedBufferAttribute(iB, 4));
    streamGeo.setAttribute("iC", new THREE.InstancedBufferAttribute(iC, 3));
    streamGeo.instanceCount = rows.length;
  }

  // Releases a puff of bubbles at a point in the water.
  function pop(x: number, y: number, z: number, count: number) {
    for (let i = 0; i < count; i++) {
      const b = nextBurst;
      nextBurst = (nextBurst + 1) % BURST;
      const spread = 0.12;
      burstB.setXYZW(
        b,
        x + (Math.random() - 0.5) * spread,
        y + (Math.random() - 0.5) * spread,
        z + (Math.random() - 0.5) * spread,
        0.012 + Math.random() * 0.035,
      );
      burstAge.setX(b, 0);
      burstState.set(
        [
          0.5 + Math.random() * 0.9,
          Math.random() * 6.28,
          2 + Math.random() * 2,
        ],
        b * 5,
      );
    }
  }

  function update(view: View) {
    const dt = view.dt;
    if (!dt) return;
    // Upload only when a bubble moved, including the frame it ends on.
    let moved = false;
    for (let b = 0; b < BURST; b++) {
      const age = burstAge.getX(b);
      if (age >= 1) continue;
      moved = true;
      const speed = burstState[b * 5];
      const phase = burstState[b * 5 + 1];
      const life = burstState[b * 5 + 2];
      const y = burstB.getY(b) + speed * dt;
      const wob = Math.sin(view.time * 5 + phase) * 0.25 * dt;
      burstB.setX(b, burstB.getX(b) + wob);
      burstB.setY(b, y);
      burstAge.setX(b, y > -0.1 ? 1 : Math.min(1, age + dt / life));
    }
    if (moved) {
      burstB.needsUpdate = true;
      burstAge.needsUpdate = true;
    }
  }

  return { streams, burst, motes, layout, pop, update };
}
