import * as THREE from "three";
import { common } from "./glsl";
import {
  backdropVertex,
  exclusion,
  EYE,
  makeMaterial,
  rng,
  screenTriangle,
  U,
  type View,
} from "./view";

// Sky gradient, sun and rainbow, drawn behind everything above the water.
const skyFragment = /* glsl */ `
${common}
${exclusion}
uniform vec3 uSunDir;
uniform float uSunSize;
uniform float uTime;
uniform float uTanTop;
varying vec2 vTan;

void main() {
  vec3 dir = normalize(vec3(vTan, -1.0));
  // 0 at the horizon, 1 at the top of the page.
  float e = max(vTan.y, 0.0) / uTanTop;
  vec3 col = S(0.76, 0.92, 1.0);
  col = mix(col, S(0.46, 0.76, 0.98), smoothstep(0.0, 0.2, e));
  col = mix(col, S(0.22, 0.60, 0.95), smoothstep(0.2, 0.55, e));
  col = mix(col, S(0.06, 0.43, 0.86), smoothstep(0.55, 1.05, e));
  col = mix(col, S(0.03, 0.30, 0.76), smoothstep(1.05, 2.4, e));

  float clear = clearOfText();

  // Thin high streaks.
  float wisp = fbm(vec2(vTan.x * 2.6 + uTime * 0.004, vTan.y * 26.0 + 3.0));
  wisp = smoothstep(0.52, 0.86, wisp) * smoothstep(0.25, 0.7, e);
  col = mix(col, vec3(1.0), wisp * 0.22 * clear);

  // Sun: a hot disc inside two soft halos.
  float d = distance(dir, uSunDir) / uSunSize;
  vec3 warm = S(1.0, 0.97, 0.86);
  col += warm * (0.75 * exp(-d * 46.0) + 0.16 * exp(-d * 9.0));
  col += warm * 7.0 * smoothstep(0.024, 0.017, d);

  gl_FragColor = vec4(col, 1.0);
}
`;

// Rainbow, drawn over the clouds and behind the islands.
const bowFragment = /* glsl */ `
${common}
${exclusion}
uniform float uTanTop;
uniform vec4 uBow; // centre, radius and width as view tangents
varying vec2 vTan;

vec3 spectrum(float t) {
  vec3 c = S(0.62, 0.30, 0.95);
  c = mix(c, S(0.30, 0.36, 1.00), smoothstep(0.00, 0.18, t));
  c = mix(c, S(0.10, 0.72, 1.00), smoothstep(0.18, 0.36, t));
  c = mix(c, S(0.22, 0.92, 0.30), smoothstep(0.36, 0.52, t));
  c = mix(c, S(1.00, 0.95, 0.18), smoothstep(0.52, 0.68, t));
  c = mix(c, S(1.00, 0.55, 0.10), smoothstep(0.68, 0.84, t));
  c = mix(c, S(1.00, 0.16, 0.14), smoothstep(0.84, 1.00, t));
  return c;
}

void main() {
  float e = max(vTan.y, 0.0) / uTanTop;
  float mist = mix(0.45, 1.0, smoothstep(0.0, 0.3, e)) * mix(0.3, 1.0, clearOfText());
  float r = length(vTan - uBow.xy);
  float t = (r - uBow.z) / uBow.w + 0.5;
  float band = smoothstep(0.0, 0.16, t) * smoothstep(1.0, 0.84, t);
  vec3 col = spectrum(clamp(t, 0.0, 1.0)) * band * 0.72;
  float a = band * 0.52;
  // A fainter second bow outside the first, colours reversed.
  float t2 = (uBow.z * 1.34 - r) / (uBow.w * 1.2) + 0.5;
  float band2 = smoothstep(0.0, 0.2, t2) * smoothstep(1.0, 0.8, t2);
  col += spectrum(clamp(t2, 0.0, 1.0)) * band2 * 0.13;
  // The sky is a touch brighter inside the bow.
  col += vec3(0.06) * smoothstep(uBow.z, uBow.z * 0.5, r);
  gl_FragColor = vec4(col, a) * mist * step(0.0, vTan.y);
}
`;

// Gulls seen head-on: two wings that beat and bend at the elbow.
const gullVertex = /* glsl */ `
attribute vec4 iBird; // start x, height, distance, size
attribute vec4 iFly; // speed, wrap half-width, phase, bob
uniform float uTime;
varying float vSpan;
void main() {
  float beat = sin(uTime * 5.0 + iFly.z) * 0.5 + 0.12;
  // Glide between bursts of flapping.
  beat *= smoothstep(-0.2, 0.4, sin(uTime * 0.45 + iFly.z * 3.0));
  beat += 0.12;
  float span = abs(position.x);
  vec3 p = position;
  p.y += sin(beat) * span - sin(beat) * max(span - 0.5, 0.0) * 0.9;
  p.x *= cos(beat * 0.6);
  float x = mod(iBird.x + iFly.x * uTime + iFly.y, 2.0 * iFly.y) - iFly.y;
  float y = iBird.y + sin(uTime * 0.4 + iFly.z) * iFly.w;
  vSpan = span;
  gl_Position = projectionMatrix * viewMatrix * vec4(vec3(x, y, -iBird.z) + p * iBird.w, 1.0);
}
`;

const gullFragment = /* glsl */ `
${common}
${exclusion}
varying float vSpan;
void main() {
  vec3 col = mix(S(0.90, 0.93, 0.97), S(0.20, 0.24, 0.32), smoothstep(0.5, 0.95, vSpan));
  float a = mix(0.1, 1.0, clearOfText());
  gl_FragColor = vec4(col * a, a);
}
`;

const cloudVertex = /* glsl */ `
attribute vec4 aCloud; // start x, speed, wrap half-width, haze
attribute vec4 aPuff; // offset from the cloud origin, radius
attribute vec3 aShape; // seed, side (-1..1), height (0..1)
uniform float uTime;
varying vec2 vUv;
varying vec4 vInfo;
void main() {
  float x = mod(aCloud.x + aCloud.y * uTime + aCloud.z, 2.0 * aCloud.z);
  vec3 center = vec3(x - aCloud.z, 0.0, 0.0) + aPuff.xyz;
  vUv = position.xy;
  vInfo = vec4(aShape, aCloud.w);
  vec3 p = center + vec3(position.xy * aPuff.w, 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const cloudFragment = /* glsl */ `
${common}
${exclusion}
uniform float uTime;
uniform vec3 uLight;
uniform vec3 uSunDir;
varying vec2 vUv;
varying vec4 vInfo;
void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  float n = fbm2(vUv * 1.9 + vInfo.x * 37.0 + uTime * 0.012);
  float a = smoothstep(1.0, 0.42, r + (n - 0.5) * 0.6);
  // Each puff is shaded as a ball, bent towards the cloud's overall form.
  vec3 ball = vec3(vUv, sqrt(max(1.0 - r * r, 0.0)));
  vec3 form = vec3(vInfo.y * 0.8, vInfo.z * 1.8 - 0.55, 0.5);
  vec3 nrm = normalize(ball * 0.7 + form);
  float lit = smoothstep(0.2, 0.9, dot(nrm, uLight) * 0.5 + 0.5);
  vec3 col = mix(S(0.56, 0.72, 0.93), vec3(1.06), lit);
  col *= mix(0.88, 1.0, smoothstep(-0.3, 0.5, vInfo.z + vUv.y * 0.3));
  col = mix(col, S(0.80, 0.93, 1.0), vInfo.w);
  a *= mix(1.0, 0.75, vInfo.w) * mix(0.12, 1.0, clearOfText());
  gl_FragColor = vec4(col * a, a);
}
`;

interface CloudSpec {
  x: number; // page px
  row: number; // page row of the base
  width: number; // px
  z: number; // metres away
  speed: number; // px per second
  haze: number;
  puffs: number;
}

export function createSky() {
  const uTanTop = { value: 0.25 };
  const uBow = { value: new THREE.Vector4(0, 0, 0.2, 0.02) };
  const backdrop = new THREE.Mesh(
    screenTriangle(),
    makeMaterial({
      vertexShader: backdropVertex,
      fragmentShader: skyFragment,
      uniforms: {
        uSunDir: U.uSunDir,
        uSunSize: U.uSunSize,
        uTime: U.uTime,
        uPage: U.uPage,
        uExcl: U.uExcl,
        uTanTop,
      },
      depthTest: false,
      depthWrite: false,
    }),
  );
  backdrop.frustumCulled = false;
  backdrop.renderOrder = -10;

  const premultiplied = {
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  };
  const bow = new THREE.Mesh(
    screenTriangle(),
    makeMaterial({
      vertexShader: backdropVertex,
      fragmentShader: bowFragment,
      uniforms: { uPage: U.uPage, uExcl: U.uExcl, uTanTop, uBow },
      ...premultiplied,
    }),
  );
  bow.frustumCulled = false;
  bow.renderOrder = 6;

  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([
        -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0,
      ]),
      3,
    ),
  );
  const clouds = new THREE.Mesh(
    quad,
    makeMaterial({
      vertexShader: cloudVertex,
      fragmentShader: cloudFragment,
      uniforms: {
        uTime: U.uTime,
        uLight: U.uLight,
        uSunDir: U.uSunDir,
        uPage: U.uPage,
        uExcl: U.uExcl,
      },
      ...premultiplied,
    }),
  );
  clouds.frustumCulled = false;
  clouds.renderOrder = 5;

  // One gull: each wing is a tapering strip from the body to the tip.
  const gullGeo = new THREE.InstancedBufferGeometry();
  const wing: number[] = [];
  for (const side of [-1, 1]) {
    const points = [
      [0, 0, -0.13],
      [0, 0, 0.13],
      [0.5 * side, 0, -0.15],
      [0.5 * side, 0, 0.08],
      [side, 0, 0],
    ];
    for (const i of [0, 1, 2, 1, 3, 2, 2, 3, 4]) wing.push(...points[i]);
  }
  gullGeo.setAttribute("position", new THREE.Float32BufferAttribute(wing, 3));
  const gulls = new THREE.Mesh(
    gullGeo,
    makeMaterial({
      vertexShader: gullVertex,
      fragmentShader: gullFragment,
      uniforms: { uTime: U.uTime, uPage: U.uPage, uExcl: U.uExcl },
      side: THREE.DoubleSide,
      ...premultiplied,
    }),
  );
  gulls.frustumCulled = false;
  gulls.renderOrder = 7;

  function layout(view: View) {
    const { w, wl, hz, k, left } = view;
    uTanTop.value = hz * k;

    // The bow's right leg comes down just left of the content column. With
    // a wide margin the whole crown shows; otherwise the bow is a larger
    // circle that enters at the left edge and only its leg is in view.
    const leg = Math.max(left - 34, 92);
    const centerRow = hz + 34;
    let radius = Math.min(hz * 0.92, left);
    let centerX = leg - radius;
    if (left < 260) {
      const enter = view.orbLeft < leg ? view.orbBottom + 12 : hz * 0.12;
      const rise = centerRow - enter;
      centerX = (leg * leg + 34 * 34 - rise * rise) / (2 * leg);
      radius = Math.hypot(centerX, rise);
    }
    uBow.value.set(
      (centerX - w / 2) * k,
      (hz - centerRow) * k,
      radius * k,
      Math.min(38, Math.max(17, radius * 0.1)) * k,
    );

    // Cloud sizes follow the height of the sky band.
    const band = Math.min(1.7, Math.max(0.9, hz / 224));
    const specs: CloudSpec[] = [];
    const rand = rng(11);
    // A line of distant clouds along the horizon.
    const far = Math.max(5, Math.round(w / 230));
    for (let i = 0; i < far; i++) {
      specs.push({
        x: ((i + 0.2 + rand() * 0.6) / far) * (w + 300) - 150,
        row: hz * (0.97 - rand() * 0.11),
        width: (120 + rand() * 150) * band,
        z: 1500 - rand() * 500,
        speed: 0.5 + rand() * 0.5,
        haze: 0.45 + rand() * 0.2,
        puffs: 13,
      });
    }
    // Larger clouds along the top of the page and under the sun. The left
    // margin stays clear for the rainbow.
    const side = Math.max(left, 60);
    specs.push({
      x: w * 0.36,
      row: wl * 0.1,
      width: Math.min(Math.max(w * 0.2, 150), 330) * band,
      z: 520,
      speed: 1.6,
      haze: 0.04,
      puffs: 24,
    });
    specs.push({
      x: w * 0.64,
      row: wl * 0.07,
      width: Math.min(Math.max(w * 0.17, 140), 290) * band,
      z: 430,
      speed: 2.1,
      haze: 0,
      puffs: 22,
    });
    specs.push({
      x: w - side * 0.45,
      row: wl * 0.6,
      width: Math.min(Math.max(side * 0.85, 150), 380) * band,
      z: 640,
      speed: 1.2,
      haze: 0.12,
      puffs: 24,
    });
    specs.sort((a, b) => b.z - a.z);

    let total = 0;
    for (const spec of specs) total += spec.puffs;
    const aCloud = new Float32Array(total * 4);
    const aPuff = new Float32Array(total * 4);
    const aShape = new Float32Array(total * 3);
    let i = 0;
    for (const spec of specs) {
      const unit = k * spec.z; // metres per px at this distance
      const width = spec.width * unit;
      const wrap = (w / 2 + 320) * unit;
      const y0 = EYE + (hz - spec.row) * unit;
      const puffs = [];
      for (let p = 0; p < spec.puffs; p++) {
        const side = rand() * 2 - 1;
        const dome = 1 - side * side;
        const height = rand() * rand() * dome;
        const radius =
          (0.13 + 0.17 * rand()) * (0.55 + 0.6 * dome) * (1 - 0.3 * height);
        puffs.push({ side, height, radius, depth: rand() - 0.5, seed: rand() });
      }
      // Back and low puffs first so the bright tops draw last.
      puffs.sort((a, b) => a.depth + a.height - (b.depth + b.height));
      for (const puff of puffs) {
        aCloud.set(
          [(spec.x - w / 2) * unit, spec.speed * unit, wrap, spec.haze],
          i * 4,
        );
        aPuff.set(
          [
            puff.side * 0.5 * width,
            y0 + (puff.height * 0.42 + puff.radius * 0.7) * width,
            -spec.z + puff.depth * 0.1 * width,
            puff.radius * width,
          ],
          i * 4,
        );
        aShape.set([puff.seed, puff.side, puff.height], i * 3);
        i++;
      }
    }
    quad.dispose();
    quad.setAttribute("aCloud", new THREE.InstancedBufferAttribute(aCloud, 4));
    quad.setAttribute("aPuff", new THREE.InstancedBufferAttribute(aPuff, 4));
    quad.setAttribute("aShape", new THREE.InstancedBufferAttribute(aShape, 3));
    quad.instanceCount = total;

    // A few gulls circling over the water.
    const birds = 6;
    const iBird = new Float32Array(birds * 4);
    const iFly = new Float32Array(birds * 4);
    for (let b = 0; b < birds; b++) {
      const z = 40 + rand() * 60;
      const unit = k * z;
      iBird.set(
        [
          (rand() - 0.5) * w * unit,
          EYE + (hz - wl * (0.22 + rand() * 0.45)) * unit,
          z,
          1.5 + rand() * 0.8,
        ],
        b * 4,
      );
      iFly.set(
        [
          (rand() < 0.5 ? -1 : 1) * (0.8 + rand() * 1.2),
          (w / 2 + 60) * unit,
          rand() * 6.28,
          0.5 + rand() * 1.2,
        ],
        b * 4,
      );
    }
    gullGeo.dispose();
    gullGeo.setAttribute("iBird", new THREE.InstancedBufferAttribute(iBird, 4));
    gullGeo.setAttribute("iFly", new THREE.InstancedBufferAttribute(iFly, 4));
    gullGeo.instanceCount = birds;
  }

  return { backdrop, clouds, bow, gulls, layout };
}
