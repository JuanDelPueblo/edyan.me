import * as THREE from "three";
import { common, underwater } from "./glsl";
import { underUniforms } from "./under";
import { D_REF, makeMaterial, rng, U, type View } from "./view";

const kelpVertex = /* glsl */ `
${common}
${underwater}
attribute vec4 aK; // height on the stalk, distance along the blade, across, kind
attribute vec4 iBase; // x, z, height, phase
attribute vec2 iLook; // colour mix, lean
uniform float uTallest;
uniform float uSway;
varying vec3 vW;
varying vec3 vN;
varying vec4 vK;
varying float vLook;
void main() {
  float tall = min(iBase.z, uTallest);
  float c = cos(iBase.w * 7.0);
  float s = sin(iBase.w * 7.0);
  vec3 p = vec3(c * position.x + s * position.z, position.y, -s * position.x + c * position.z);
  vec3 n = vec3(c * normal.x + s * normal.z, normal.y, -s * normal.x + c * normal.z);
  p *= tall;
  float h = aK.x;
  float ph = iBase.w;
  float t = uTime;
  // The stalk sways more the higher it goes and leans with the current.
  vec2 sway = vec2(
    sin(t * 0.55 + h * 2.6 + ph) + 0.5 * sin(t * 0.93 + h * 5.1 + ph * 1.3),
    cos(t * 0.47 + h * 2.2 + ph * 0.7) + 0.5 * sin(t * 0.81 + h * 4.3 + ph)
  ) * 0.055 * tall * pow(h, 1.4) * uSway;
  sway.x += iLook.y * h * h * tall * 0.22;
  p.xz += sway;
  // Blades flutter towards their tips.
  float flutter = sin(t * 1.8 + h * 13.0 + ph * 3.0) * aK.y * aK.w * uSway;
  p.y += flutter * 0.012 * tall;
  p.xz += n.xz * flutter * 0.01 * tall;
  vec2 base = iBase.xy;
  vW = vec3(base.x, uFloorY + dune(base) - 0.04, base.y) + p;
  vN = n;
  vK = aK;
  vLook = iLook.x;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}
`;

const kelpFragment = /* glsl */ `
${common}
${underwater}
varying vec3 vW;
varying vec3 vN;
varying vec4 vK;
varying float vLook;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 alb;
  if (vK.w < 0.5) {
    alb = S(0.62, 0.58, 0.16) * 1.3;
  } else {
    alb = mix(S(0.20, 0.56, 0.10), S(0.54, 0.85, 0.24), vLook);
    alb = mix(alb, S(0.77, 0.97, 0.48), vK.y * 0.45);
    // A darker midrib and paler edges.
    alb *= 0.72 + 0.28 * smoothstep(0.0, 0.3, abs(vK.z));
  }
  // Plants cast shadows but take none: their thin blades would shadow
  // themselves.
  vec3 col = alb * underLight(vW, n, 0.8, 1.0);
  // Sunlight through the blade.
  col += alb * S(1.0, 1.0, 0.45) * max(dot(-n, uSunU), 0.0) * 0.55;
  gl_FragColor = vec4(applyFog(col, vW), 1.0);
}
`;

// One kelp plant, one unit tall: a stalk with blades up both sides.
function strandGeometry() {
  const rand = rng(3);
  const position: number[] = [];
  const normal: number[] = [];
  const info: number[] = [];
  function quad(
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    d: THREE.Vector3,
    n: THREE.Vector3,
    ka: number[],
    kb: number[],
    kc: number[],
    kd: number[],
  ) {
    const points = [a, b, c, a, c, d];
    const infos = [ka, kb, kc, ka, kc, kd];
    for (let i = 0; i < 6; i++) {
      position.push(points[i].x, points[i].y, points[i].z);
      normal.push(n.x, n.y, n.z);
      info.push(...infos[i]);
    }
  }

  // Stalk: two crossed ribbons.
  const segments = 14;
  for (let cross = 0; cross < 2; cross++) {
    const side = new THREE.Vector3(cross ? 0 : 0.006, 0, cross ? 0.006 : 0);
    const face = new THREE.Vector3(cross ? 1 : 0, 0, cross ? 0 : 1);
    for (let i = 0; i < segments; i++) {
      const y0 = i / segments;
      const y1 = (i + 1) / segments;
      quad(
        new THREE.Vector3(-side.x, y0, -side.z),
        new THREE.Vector3(side.x, y0, side.z),
        new THREE.Vector3(side.x, y1, side.z),
        new THREE.Vector3(-side.x, y1, -side.z),
        face,
        [y0, 0, -1, 0],
        [y0, 0, 1, 0],
        [y1, 0, 1, 0],
        [y1, 0, -1, 0],
      );
    }
  }

  // Long narrow blades spiral up the stalk and trail off with the current.
  // Their normals curl across the width so each blade shades as a ribbon.
  const blades = 44;
  const steps = 8;
  const up = new THREE.Vector3(0, 1, 0);
  const drift = new THREE.Vector3(1, 0, 0.2).normalize();
  for (let b = 0; b < blades; b++) {
    const top = b >= blades - 4;
    const h = top ? 1 : 0.05 + 0.93 * (b / blades) + rand() * 0.02;
    const turn = b * 2.4 + rand() * 0.5;
    const out = new THREE.Vector3(Math.cos(turn), 0, Math.sin(turn));
    const length = (0.16 + rand() * 0.1) * (1 - 0.35 * h * h);
    const width = 0.0085 + rand() * 0.004;
    const rise = top ? 0.9 : 0.25 + rand() * 0.35;
    const rows: THREE.Vector3[][] = [];
    const faces: THREE.Vector3[][] = [];
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      // The blade leaves the stalk outwards, then bends into the current.
      const dir = out
        .clone()
        .lerp(drift, t * 0.7)
        .normalize();
      const mid = new THREE.Vector3(0, h, 0)
        .addScaledVector(out, length * 0.35 * Math.min(1, t * 2.5))
        .addScaledVector(dir, length * 0.75 * t)
        .addScaledVector(up, length * (rise * t - 0.25 * t * t));
      const tangent = dir
        .clone()
        .addScaledVector(up, rise - 0.5 * t)
        .normalize();
      const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const face = new THREE.Vector3().crossVectors(side, tangent).normalize();
      const half = width * Math.pow(Math.sin(Math.PI * (0.06 + 0.92 * t)), 0.5);
      const ruffle = Math.sin(t * 14 + b) * width * 0.5;
      rows.push([
        mid.clone().addScaledVector(side, -half).addScaledVector(face, ruffle),
        mid.clone().addScaledVector(side, half).addScaledVector(face, -ruffle),
      ]);
      faces.push([
        face.clone().addScaledVector(side, -0.55).normalize(),
        face.clone().addScaledVector(side, 0.55).normalize(),
      ]);
    }
    for (let s = 0; s < steps; s++) {
      const t0 = s / steps;
      const t1 = (s + 1) / steps;
      const corners = [
        [s, 0, t0],
        [s, 1, t0],
        [s + 1, 1, t1],
        [s, 0, t0],
        [s + 1, 1, t1],
        [s + 1, 0, t1],
      ];
      for (const [row, col, t] of corners) {
        const p = rows[row][col];
        const n = faces[row][col];
        position.push(p.x, p.y, p.z);
        normal.push(n.x, n.y, n.z);
        info.push(h, t, col * 2 - 1, 1);
      }
    }
  }
  return { position, normal, info };
}

// One blade of seagrass, one unit tall.
function grassGeometry() {
  const position: number[] = [];
  const normal: number[] = [];
  const info: number[] = [];
  const steps = 5;
  for (let s = 0; s < steps; s++) {
    const y0 = s / steps;
    const y1 = (s + 1) / steps;
    const w0 = 0.035 * (1 - y0 * 0.8);
    const w1 = 0.035 * (1 - y1 * 0.8);
    const b0 = 0.25 * y0 * y0;
    const b1 = 0.25 * y1 * y1;
    const corners = [
      [-w0, y0, b0, -1],
      [w0, y0, b0, 1],
      [w1, y1, b1, 1],
      [-w0, y0, b0, -1],
      [w1, y1, b1, 1],
      [-w1, y1, b1, -1],
    ];
    for (const [x, y, z, u] of corners) {
      position.push(x, y, z);
      normal.push(0, 0.3, 1);
      info.push(y, y, u, 1);
    }
  }
  return { position, normal, info };
}

function instanced(
  data: { position: number[]; normal: number[]; info: number[] },
  material: THREE.ShaderMaterial,
) {
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(data.position, 3),
  );
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(data.normal, 3));
  geo.setAttribute("aK", new THREE.Float32BufferAttribute(data.info, 4));
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  // Layer 1 holds what the shadow map is drawn from.
  mesh.layers.enable(1);
  return mesh;
}

function setInstances(mesh: THREE.Mesh, rows: number[][]) {
  const geo = mesh.geometry as THREE.InstancedBufferGeometry;
  const iBase = new Float32Array(rows.length * 4);
  const iLook = new Float32Array(rows.length * 2);
  for (let i = 0; i < rows.length; i++) {
    iBase.set(rows[i].slice(0, 4), i * 4);
    iLook.set(rows[i].slice(4, 6), i * 2);
  }
  // Frees the GPU buffers of the previous layout; three.js uploads the
  // shared ones again on the next draw.
  geo.dispose();
  geo.setAttribute("iBase", new THREE.InstancedBufferAttribute(iBase, 4));
  geo.setAttribute("iLook", new THREE.InstancedBufferAttribute(iLook, 2));
  geo.instanceCount = rows.length;
}

export function createKelp() {
  const uniforms = {
    ...underUniforms(),
    uTallest: { value: 10 },
    uSway: U.uSway,
  };
  const material = makeMaterial({
    vertexShader: kelpVertex,
    fragmentShader: kelpFragment,
    uniforms,
    side: THREE.DoubleSide,
  });
  const kelp = instanced(strandGeometry(), material);
  const grass = instanced(grassGeometry(), material);

  function layout(view: View) {
    const { w, left, mpp } = view;
    const rand = rng(77);
    const strands: number[][] = [];
    const column = Math.min(800, w - 2 * left);
    let tries = 0;
    while (strands.length < 24 && tries++ < 4000) {
      const z = -(3.6 + Math.pow(rand(), 1.3) * 24);
      const px = rand() * (w + 500) - 250;
      // Keep most of the tall kelp out from behind the content column, unless
      // the column fills the page.
      const behind = px > left + 30 && px < left + column - 30;
      if (behind && rand() < (left > 100 ? 0.72 : 0.3)) continue;
      const x = ((px - w / 2) * mpp * -z) / D_REF;
      const height = 2.2 + rand() * rand() * 5.5;
      strands.push([x, z, height, rand() * 6.28, rand(), 0.4 + rand() * 0.8]);
    }
    // A second, shorter strand rounds out each plant.
    const plants = strands.length;
    for (let i = 0; i < plants; i++) {
      const [x, z, height] = strands[i];
      strands.push([
        x + rand() * 0.7 - 0.35,
        z + rand() * 0.7 - 0.35,
        height * (0.45 + rand() * 0.5),
        rand() * 6.28,
        rand(),
        0.4 + rand() * 0.8,
      ]);
    }
    // A row of short plants close to the camera, in view under the content
    // at the end of the page on any width.
    const front = Math.max(4, Math.round(w / 190));
    for (let i = 0; i < front; i++) {
      const z = -(4.6 + rand() * 2.2);
      const px = ((i + 0.2 + rand() * 0.6) / front) * w;
      const x = ((px - w / 2) * mpp * -z) / D_REF;
      strands.push([
        x,
        z,
        1 + rand() * 1.1,
        rand() * 6.28,
        rand(),
        0.4 + rand() * 0.8,
      ]);
    }
    setInstances(kelp, strands);

    const blades: number[][] = [];
    for (let patch = 0; patch < 60; patch++) {
      const z = -(2.2 + Math.pow(rand(), 1.5) * 22);
      const half = ((w / 2 + 200) * mpp * -z) / D_REF;
      const x = (rand() * 2 - 1) * half;
      const size = 0.3 + rand() * 0.8;
      for (let i = 0; i < 14; i++) {
        blades.push([
          x + (rand() - 0.5) * size * 2,
          z + (rand() - 0.5) * size * 2,
          0.25 + rand() * 0.6,
          rand() * 6.28,
          0.15 + rand() * 0.35,
          0.2 + rand() * 0.5,
        ]);
      }
    }
    setInstances(grass, blades);
  }

  // Plants stay in the lower half of the water, however short the page is.
  // Returns the height they are cut off at.
  function update(view: View) {
    uniforms.uTallest.value = Math.max(0.6, -view.floorY * 0.5);
    return uniforms.uTallest.value;
  }

  return { kelp, grass, layout, update };
}
