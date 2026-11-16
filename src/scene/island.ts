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
  return mix(col, S(0.76, 0.92, 1.0), 1.0 - exp(-d * 0.0009));
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
    const ball = new THREE.IcosahedronGeometry(radius, 2);
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
    setTrees(broadleaf, leaves);
    setTrees(palms, fronds);
  }

  return { hill, cay, broadleaf, palms, layout };
}
