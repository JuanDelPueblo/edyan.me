import * as THREE from "three";
import { common } from "./glsl";
import { U, makeMaterial, type View } from "./view";

// A pod of dolphins porpoising across the sea above the waterline. Each one
// follows a track along uHeading: it rides a sine in height, so it leaps
// clear of the water for part of every cycle and runs under it for the rest.
// The sea surface hides the underwater part.
const track = /* glsl */ `
uniform float uTime;
uniform vec4 uPod; // speed, half the length of the track, leap rate, leap height
uniform vec3 uHeading;
uniform vec3 uOrigin;

// The sine is shifted down so a leap lasts under half the cycle.
const float SINK = 0.2;

float trackAt(float start, float t) {
  return mod(start + uPod.x * t + uPod.y, 2.0 * uPod.y) - uPod.y;
}
`;

const dolphinVertex = /* glsl */ `
${track}
attribute vec3 aD; // nose-to-tail position, back-to-belly, part
attribute vec4 iD; // start along the track, sideways offset, phase, length
attribute float iRoll;
varying vec3 vW;
varying vec3 vN;
varying vec3 vO;
varying vec3 vD;
void main() {
  float size = iD.w;
  // Every vertex sits on the track at its own point along the body, so the
  // body curves with the arc of the leap.
  float ahead = position.x * size;
  float th = uPod.z * (uTime + ahead / uPod.x) + iD.z;
  float height = uPod.w * (sin(th) - SINK) / (1.0 - SINK);
  float climb = uPod.w * uPod.z * cos(th) / (1.0 - SINK);
  vec3 forward = normalize(uHeading * uPod.x + vec3(0.0, climb, 0.0));
  vec3 side = normalize(cross(uHeading, vec3(0.0, 1.0, 0.0)));
  vec3 up = normalize(cross(side, forward));
  // A slight roll shows the belly and the flukes.
  float roll = iRoll + 0.25 * sin(th);
  float c = cos(roll);
  float s = sin(roll);
  vec3 up2 = up * c + side * s;
  vec3 side2 = side * c - up * s;
  // Tail beat.
  float beat = sin(th * 2.0 - aD.x * 3.0) * 0.035 * aD.x * aD.x;
  float along = trackAt(iD.x, uTime) + ahead;
  vW = uOrigin + uHeading * along + side * iD.y + vec3(0.0, height, 0.0)
    + (up2 * (position.y + beat) + side2 * position.z) * size;
  vN = forward * normal.x + up2 * normal.y + side2 * normal.z;
  vO = position;
  vD = aD;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}
`;

const dolphinFragment = /* glsl */ `
${common}
uniform vec3 uLight;
uniform vec3 uPage;
varying vec3 vW;
varying vec3 vN;
varying vec3 vO;
varying vec3 vD;
void main() {
  // The reflection has no sea surface to hide what is under water.
  if (uPage.z < 0.5 && vW.y < 0.0) discard;
  vec3 view = normalize(cameraPosition - vW);
  vec3 n = normalize(vN);
  if (vD.z > 0.5 && dot(n, view) < 0.0) n = -n;

  // Dark back, paler flanks, white belly.
  vec3 back = S(0.27, 0.39, 0.56);
  vec3 alb = mix(S(0.56, 0.68, 0.80), back, smoothstep(0.05, 0.7, vD.y));
  alb = mix(alb, S(0.96, 0.97, 0.99), smoothstep(-0.1, -0.6, vD.y));
  if (vD.z > 0.5) alb = back * 0.92;
  float eye = distance(vO.xy, vec2(0.352, 0.014));
  alb = mix(alb, vec3(0.02), smoothstep(0.014, 0.01, eye) * step(vD.z, 0.5));
  // The line of the mouth along the beak.
  float mouth = smoothstep(0.004, 0.001, abs(vO.y + 0.004 + (0.5 - vO.x) * 0.06))
    * smoothstep(0.36, 0.39, vO.x) * step(vD.z, 0.5);
  alb = mix(alb, back * 0.5, mouth * 0.7);

  float ndl = clamp(dot(n, uLight) * 0.6 + 0.4, 0.0, 1.0);
  vec3 col = alb * (S(0.50, 0.70, 0.92) * 0.62 + S(1.0, 0.97, 0.84) * 1.15 * ndl);
  // Wet skin: a sharp highlight and a rim of sky.
  vec3 h = normalize(uLight + view);
  col += vec3(0.95) * pow(max(dot(n, h), 0.0), 50.0);
  col += S(0.62, 0.82, 1.0) * pow(1.0 - max(dot(n, view), 0.0), 3.0) * 0.4;
  gl_FragColor = vec4(col, 1.0);
}
`;

// Spray thrown up where a dolphin leaves and re-enters the water, and the
// ring of foam it leaves behind.
const splashVertex = /* glsl */ `
${track}
attribute vec4 iD;
attribute vec4 iS; // 0 leaving or 1 entering, two random numbers, 0 spray or 1 ring
varying vec2 vUv;
varying vec2 vFade;
void main() {
  float cross0 = asin(SINK);
  float crossing = iS.x < 0.5 ? cross0 : 3.14159265 - cross0;
  float since = mod(uPod.z * uTime + iD.z - crossing, 6.2831853) / uPod.z;
  vec3 side = normalize(cross(uHeading, vec3(0.0, 1.0, 0.0)));
  vec3 at = uOrigin + uHeading * trackAt(iD.x, uTime - since) + side * iD.y;
  float scale = iD.w / 2.5;
  vUv = position.xy;
  vec4 mv;
  float age;
  if (iS.w < 0.5) {
    age = since / 0.8;
    vec3 fling = uHeading * (0.4 + iS.y * 2.2)
      + side * (iS.z - 0.5) * 2.4
      + vec3(0.0, 2.2 + fract(iS.y * 7.3) * 3.4, 0.0);
    vec3 p = at + (fling * since + vec3(0.0, -4.9 * since * since, 0.0)) * scale;
    mv = viewMatrix * vec4(p, 1.0);
    mv.xy += position.xy * (0.12 + 0.2 * iS.z) * scale * (0.7 + age * 1.3);
    vFade = vec2(pow(max(1.0 - age, 0.0), 1.5) * smoothstep(0.0, 0.06, age), 0.0);
  } else {
    age = since / 1.4;
    float radius = (0.35 + 2.0 * age) * scale;
    vec3 p = at + (uHeading * position.x + side * position.y) * radius;
    p.y = 0.03;
    mv = viewMatrix * vec4(p, 1.0);
    vFade = vec2(max(1.0 - age, 0.0) * 0.8, 1.0);
  }
  gl_Position = age < 1.0 ? projectionMatrix * mv : vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const splashFragment = /* glsl */ `
varying vec2 vUv;
varying vec2 vFade;
void main() {
  float r = length(vUv);
  float a = vFade.y < 0.5
    ? smoothstep(1.0, 0.15, r)
    : smoothstep(0.5, 0.8, r) * smoothstep(1.0, 0.86, r);
  a *= vFade.x;
  gl_FragColor = vec4(vec3(1.05) * a, a);
}
`;

// Body outline from nose to tail: position, top, bottom, half width.
const outline = [
  [0.0, 0.004, -0.008, 0.005],
  [0.03, 0.017, -0.021, 0.017],
  [0.09, 0.025, -0.03, 0.024],
  [0.125, 0.058, -0.038, 0.042],
  [0.2, 0.088, -0.062, 0.07],
  [0.35, 0.105, -0.095, 0.09],
  [0.5, 0.1, -0.09, 0.082],
  [0.65, 0.08, -0.068, 0.058],
  [0.8, 0.052, -0.04, 0.03],
  [0.92, 0.03, -0.024, 0.013],
  [0.98, 0.016, -0.012, 0.008],
];

// Smooth curve through one column of the outline.
function profile(u: number, column: number) {
  let i = 0;
  while (i < outline.length - 2 && u > outline[i + 1][0]) i++;
  const p0 = outline[Math.max(i - 1, 0)];
  const p1 = outline[i];
  const p2 = outline[i + 1];
  const p3 = outline[Math.min(i + 2, outline.length - 1)];
  const t = Math.min(1, Math.max(0, (u - p1[0]) / (p2[0] - p1[0])));
  // Tangents scaled by the spacing of the points on either side.
  const m1 = ((p2[column] - p0[column]) / (p2[0] - p0[0])) * (p2[0] - p1[0]);
  const m2 = ((p3[column] - p1[column]) / (p3[0] - p1[0])) * (p2[0] - p1[0]);
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * p1[column] +
    (t3 - 2 * t2 + t) * m1 +
    (-2 * t3 + 3 * t2) * p2[column] +
    (t3 - t2) * m2
  );
}

// One dolphin, one unit long, nose at x = +0.5.
function dolphinGeometry() {
  const position: number[] = [];
  const info: number[] = [];
  const index: number[] = [];
  function vertex(x: number, y: number, z: number, d: number[]) {
    position.push(x, y, z);
    info.push(d[0], d[1], d[2]);
    return position.length / 3 - 1;
  }

  const stations = 44;
  const around = 16;
  for (let i = 0; i <= stations; i++) {
    const u = (i / stations) * 0.98;
    const top = profile(u, 1);
    const bottom = profile(u, 2);
    const half = profile(u, 3);
    for (let j = 0; j < around; j++) {
      const turn = (j / around) * Math.PI * 2;
      vertex(
        0.5 - u,
        (top + bottom) / 2 + ((top - bottom) / 2) * Math.cos(turn),
        half * Math.sin(turn),
        [u, Math.cos(turn), 0],
      );
    }
  }
  for (let i = 0; i < stations; i++) {
    for (let j = 0; j < around; j++) {
      const a = i * around + j;
      const b = i * around + ((j + 1) % around);
      index.push(a, a + around, b, b, a + around, b + around);
    }
  }
  const bodyCount = position.length / 3;

  // Flat fins, each a fan of triangles from its first point.
  const flat: number[][] = [];
  function fin(points: number[][], normal: number[], u: number) {
    const first = position.length / 3;
    for (const p of points) {
      vertex(p[0], p[1], p[2], [u, 1, 1]);
      flat.push(normal);
    }
    for (let i = 1; i < points.length - 1; i++) {
      index.push(first, first + i, first + i + 1);
    }
  }
  // Dorsal fin, swept back.
  const dorsal = profile(0.5, 1) - 0.012;
  fin(
    [
      [0.5 - 0.42, dorsal, 0],
      [0.5 - 0.5, dorsal + 0.075, 0],
      [0.5 - 0.6, dorsal + 0.118, 0],
      [0.5 - 0.585, dorsal + 0.05, 0],
      [0.5 - 0.58, dorsal - 0.01, 0],
    ],
    [0, 0, 1],
    0.5,
  );
  // Tail flukes, lying flat.
  for (const side of [-1, 1]) {
    fin(
      [
        [0.5 - 0.94, 0.002, 0],
        [0.5 - 0.975, 0.002, side * 0.075],
        [0.5 - 1.04, 0.002, side * 0.15],
        [0.5 - 1.02, 0.002, side * 0.07],
        [0.5 - 0.995, 0.002, 0],
      ],
      [0, 1, 0],
      1,
    );
  }
  // Flippers, angled down and out.
  for (const side of [-1, 1]) {
    const y = profile(0.27, 2) * 0.55;
    const z = side * profile(0.27, 3) * 0.85;
    fin(
      [
        [0.5 - 0.25, y, z],
        [0.5 - 0.31, y - 0.035, z + side * 0.05],
        [0.5 - 0.4, y - 0.09, z + side * 0.085],
        [0.5 - 0.36, y - 0.03, z + side * 0.04],
        [0.5 - 0.32, y + 0.002, z],
      ],
      [0.2, 0.65, side * 0.73],
      0.3,
    );
  }

  const geo = new THREE.InstancedBufferGeometry();
  geo.setIndex(index);
  geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute("aD", new THREE.Float32BufferAttribute(info, 3));
  geo.computeVertexNormals();
  const normal = geo.getAttribute("normal");
  for (let i = 0; i < flat.length; i++) {
    normal.setXYZ(bodyCount + i, flat[i][0], flat[i][1], flat[i][2]);
  }
  return geo;
}

const POD = 4;
const SPRAY = 12;

export function createDolphins() {
  const uniforms = {
    uTime: U.uTime,
    uLight: U.uLight,
    uPage: U.uPage,
    uPod: { value: new THREE.Vector4(6, 60, 2.4, 2) },
    uHeading: { value: new THREE.Vector3(1, 0, 0) },
    uOrigin: { value: new THREE.Vector3(0, 0, -40) },
  };

  const geo = dolphinGeometry();
  const iD = new THREE.InstancedBufferAttribute(new Float32Array(POD * 4), 4);
  const iRoll = new THREE.InstancedBufferAttribute(
    new Float32Array([0.3, -0.25, 0.42, 0.18]),
    1,
  );
  geo.setAttribute("iD", iD);
  geo.setAttribute("iRoll", iRoll);
  geo.instanceCount = POD;
  const dolphins = new THREE.Mesh(
    geo,
    makeMaterial({
      vertexShader: dolphinVertex,
      fragmentShader: dolphinFragment,
      uniforms,
      side: THREE.DoubleSide,
    }),
  );
  dolphins.frustumCulled = false;

  // Per dolphin and per crossing: a burst of spray and one foam ring.
  const each = SPRAY + 1;
  const count = POD * 2 * each;
  const splashGeo = new THREE.InstancedBufferGeometry();
  splashGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([
        -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0,
      ]),
      3,
    ),
  );
  const sD = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
  const sS = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
  let seed = 7;
  function random() {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  }
  for (let i = 0; i < count; i++) {
    const crossing = Math.floor(i / each) % 2;
    const ring = i % each === SPRAY ? 1 : 0;
    sS.setXYZW(i, crossing, random(), random(), ring);
  }
  splashGeo.setAttribute("iD", sD);
  splashGeo.setAttribute("iS", sS);
  splashGeo.instanceCount = count;
  const splashes = new THREE.Mesh(
    splashGeo,
    makeMaterial({
      vertexShader: splashVertex,
      fragmentShader: splashFragment,
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    }),
  );
  splashes.frustumCulled = false;
  splashes.renderOrder = 8;

  function layout(view: View) {
    const { w, k } = view;
    // Narrow pages get a closer, slower pod so it stays in view for longer.
    const wide = Math.min(1, Math.max(0, (w - 400) / 700));
    const speed = 4.4 + 1.1 * wide;
    const dist = 24 + 3 * wide;
    const rate = (Math.PI * 2) / (2.3 + 0.3 * wide);
    const half = (w / 2) * k * dist;
    const reach = Math.max(half * 1.9, 22);
    // The pod crosses left to right, angled a little towards the camera.
    uniforms.uPod.value.set(speed, reach, rate, 1.8);
    uniforms.uHeading.value.set(Math.cos(0.2), 0, Math.sin(0.2));
    uniforms.uOrigin.value.set(0, 0, -dist);

    // uTime starts at 20. The leader is then at the top of a leap near the
    // left edge, with the others following a little behind and out of step.
    const start = 20;
    const lag = [0, 1.9, 3.6, 5.6];
    const sideways = [0, 2.6, -3, 5];
    const late = [0, 0.9, 1.8, 2.9];
    const length = [2.5, 2.2, 2.7, 1.9];
    for (let i = 0; i < POD; i++) {
      iD.setXYZW(
        i,
        -0.8 * half - lag[i] - speed * start,
        sideways[i],
        Math.PI / 2 - rate * start - late[i],
        length[i],
      );
      for (let j = 0; j < 2 * each; j++) {
        sD.setXYZW(
          i * 2 * each + j,
          iD.getX(i),
          iD.getY(i),
          iD.getZ(i),
          iD.getW(i),
        );
      }
    }
    iD.needsUpdate = true;
    sD.needsUpdate = true;
  }

  return { dolphins, splashes, layout };
}
