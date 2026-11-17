import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { common, reefShade, underwater } from "./glsl";
import { underUniforms } from "./under";
import { D_REF, makeMaterial, rng, type View } from "./view";

const reefVertex = /* glsl */ `
${common}
${underwater}
attribute float aTip;
attribute vec4 iBase; // x, z, size, turn
attribute vec4 iLook; // kind, colour, squash, how far it is sunk in the sand
varying vec3 vW;
varying vec3 vN;
varying vec3 vO;
varying vec4 vLook;
varying float vTip;
void main() {
  float c = cos(iBase.w);
  float s = sin(iBase.w);
  vec3 p = vec3(c * position.x + s * position.z, position.y, -s * position.x + c * position.z);
  vec3 n = vec3(c * normal.x + s * normal.z, normal.y, -s * normal.x + c * normal.z);
  p.y *= iLook.z;
  n.y /= iLook.z;
  vec2 base = iBase.xy;
  vW = vec3(base.x, uFloorY + dune(base) - iLook.w * iBase.z, base.y) + p * iBase.z;
  vN = n;
  vO = position;
  vLook = iLook;
  vTip = aTip;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}
`;

const reefFragment = /* glsl */ `
${common}
${underwater}
${reefShade}
varying vec3 vW;
varying vec3 vN;
varying vec3 vO;
varying vec4 vLook;
varying float vTip;

vec3 palette(float h) {
  if (h < 0.24) return S(1.0, 0.26, 0.34);
  if (h < 0.46) return S(1.0, 0.52, 0.12);
  if (h < 0.66) return S(1.0, 0.42, 0.72);
  if (h < 0.84) return S(1.0, 0.86, 0.24);
  if (h < 0.93) return S(0.74, 0.42, 1.0);
  return S(0.16, 0.86, 0.80);
}

void main() {
  vec3 n = normalize(vN);
  float kind = vLook.x;
  vec3 tint = palette(vLook.y);
  vec3 alb;
  if (kind < 0.5) {
    // Rock: mottled stone, darker in the hollows, with patches of
    // coralline colour and a dusting of sand on top.
    float nz = fbm(vO.xy * 5.0 + vO.z * 4.0 + vLook.y * 10.0);
    float fine = fbm2(vO.zx * 17.0 + vO.y * 13.0);
    alb = mix(S(0.58, 0.46, 0.52), S(0.88, 0.76, 0.72), nz) * (0.8 + 0.4 * fine);
    float crust = smoothstep(0.46, 0.6, fbm2(vO.zy * 3.6 + vLook.y * 30.0));
    alb = mix(alb, tint * (0.6 + 0.4 * fine), crust * 0.8);
    float crust2 = smoothstep(0.54, 0.64, fbm2(vO.xz * 4.4 + vLook.y * 71.0));
    alb = mix(alb, palette(fract(vLook.y + 0.37)) * 0.85, crust2 * 0.7);
    alb = mix(alb, S(0.88, 0.82, 0.66), smoothstep(0.78, 0.98, n.y) * 0.4);
  } else if (kind < 1.5) {
    // Dome coral with winding grooves.
    float m = fbm(vO.xz * 2.6 + vO.y * 2.0 + vLook.y * 9.0);
    alb = tint * (0.55 + 0.45 * smoothstep(-0.3, 0.3, sin(m * 46.0)));
  } else if (kind < 2.5) {
    alb = mix(tint, vec3(1.0, 0.97, 0.90), smoothstep(0.55, 1.0, vTip) * 0.7);
  } else {
    float dots = step(0.78, hash21(floor(vO.xz * 13.0)));
    alb = mix(S(1.0, 0.36, 0.12), S(1.0, 0.80, 0.42), dots);
  }
  // Whiter light than the sand gets, so the warm colours stay warm.
  vec3 light = underLight(vW, n, 0.9, reefLit(vW, n));
  light = mix(light, vec3(dot(light, vec3(0.34))), 0.55) * 1.1;
  vec3 col = alb * light;
  gl_FragColor = vec4(applyFog(col, vW), 1.0);
}
`;

function smooth(geo: THREE.BufferGeometry) {
  geo.deleteAttribute("normal");
  geo.deleteAttribute("uv");
  const merged = mergeVertices(geo, 1e-4);
  merged.computeVertexNormals();
  return merged;
}

function blobGeometry() {
  const geo = smooth(new THREE.IcosahedronGeometry(1, 3));
  const pos = geo.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const lump =
      1 +
      0.22 *
        Math.sin(x * 2.1 + 1) *
        Math.sin(y * 2.7 + 2) *
        Math.sin(z * 2.3 + 3) +
      0.1 * Math.sin(x * 5.3) * Math.sin(z * 4.9 + y * 3);
    pos.setXYZ(i, x * lump, y * lump, z * lump);
  }
  geo.computeVertexNormals();
  return geo;
}

// Branching coral about one unit tall, built from tapered tubes.
function branchGeometry() {
  const rand = rng(41);
  const position: number[] = [];
  const normal: number[] = [];
  const tip: number[] = [];
  const sides = 5;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  function ringPoint(
    center: THREE.Vector3,
    u: THREE.Vector3,
    v: THREE.Vector3,
    radius: number,
    i: number,
  ) {
    const turn = (i / sides) * Math.PI * 2;
    const n = u
      .clone()
      .multiplyScalar(Math.cos(turn))
      .addScaledVector(v, Math.sin(turn));
    return { p: center.clone().addScaledVector(n, radius), n };
  }
  function grow(
    from: THREE.Vector3,
    dir: THREE.Vector3,
    length: number,
    radius: number,
    depth: number,
    t: number,
  ) {
    const to = from.clone().addScaledVector(dir, length);
    a.set(0.3, 1, 0.2).cross(dir).normalize();
    const u = a.clone();
    const v = b.crossVectors(dir, u).normalize().clone();
    const t1 = t + (1 - t) / (depth + 1);
    for (let i = 0; i < sides; i++) {
      const p0 = ringPoint(from, u, v, radius, i);
      const p1 = ringPoint(from, u, v, radius, i + 1);
      const p2 = ringPoint(to, u, v, radius * 0.72, i + 1);
      const p3 = ringPoint(to, u, v, radius * 0.72, i);
      const corners = [p0, p1, p2, p0, p2, p3];
      const tips = [t, t, t1, t, t1, t1];
      for (let c = 0; c < 6; c++) {
        position.push(corners[c].p.x, corners[c].p.y, corners[c].p.z);
        normal.push(corners[c].n.x, corners[c].n.y, corners[c].n.z);
        tip.push(tips[c]);
      }
    }
    if (depth === 0) return;
    const children = depth > 2 ? 3 : 2;
    for (let c = 0; c < children; c++) {
      const next = dir
        .clone()
        .add(
          new THREE.Vector3(
            rand() * 2 - 1,
            rand() * 0.6 + 0.2,
            rand() * 2 - 1,
          ).multiplyScalar(0.85),
        )
        .normalize();
      grow(to, next, length * 0.74, radius * 0.72, depth - 1, t1);
    }
  }
  grow(
    new THREE.Vector3(0, -0.1, 0),
    new THREE.Vector3(0, 1, 0),
    0.34,
    0.07,
    4,
    0,
  );
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
  geo.setAttribute("aTip", new THREE.Float32BufferAttribute(tip, 1));
  return geo;
}

function starGeometry() {
  const position: number[] = [];
  const points: number[][] = [];
  for (let i = 0; i < 10; i++) {
    const turn = (i / 10) * Math.PI * 2;
    const radius = i % 2 ? 0.36 : 1;
    points.push([
      Math.cos(turn) * radius,
      i % 2 ? 0.1 : 0.03,
      Math.sin(turn) * radius,
    ]);
  }
  for (let i = 0; i < 10; i++) {
    const p = points[i];
    const q = points[(i + 1) % 10];
    position.push(0, 0.2, 0, q[0], q[1], q[2], p[0], p[1], p[2]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geo.computeVertexNormals();
  return geo;
}

function reefMesh(base: THREE.BufferGeometry, material: THREE.ShaderMaterial) {
  const geo = new THREE.InstancedBufferGeometry();
  geo.setIndex(base.getIndex());
  geo.setAttribute("position", base.getAttribute("position"));
  geo.setAttribute("normal", base.getAttribute("normal"));
  const count = base.getAttribute("position").count;
  geo.setAttribute(
    "aTip",
    base.getAttribute("aTip") ??
      new THREE.BufferAttribute(new Float32Array(count), 1),
  );
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  // Layer 1 holds what the shadow map is drawn from.
  mesh.layers.enable(1);
  return mesh;
}

function setInstances(mesh: THREE.Mesh, rows: number[][]) {
  const geo = mesh.geometry as THREE.InstancedBufferGeometry;
  const iBase = new Float32Array(rows.length * 4);
  const iLook = new Float32Array(rows.length * 4);
  for (let i = 0; i < rows.length; i++) {
    iBase.set(rows[i].slice(0, 4), i * 4);
    iLook.set(rows[i].slice(4, 8), i * 4);
  }
  // Frees the GPU buffers of the previous layout; three.js uploads the
  // shared ones again on the next draw.
  geo.dispose();
  geo.setAttribute("iBase", new THREE.InstancedBufferAttribute(iBase, 4));
  geo.setAttribute("iLook", new THREE.InstancedBufferAttribute(iLook, 4));
  geo.instanceCount = rows.length;
}

export function createSeabed() {
  const material = makeMaterial({
    vertexShader: reefVertex,
    fragmentShader: reefFragment,
    uniforms: underUniforms(),
  });
  const blobs = reefMesh(blobGeometry(), material);
  const branches = reefMesh(branchGeometry(), material);
  const stars = reefMesh(starGeometry(), material);

  function layout(view: View) {
    const { w, mpp } = view;
    const rand = rng(303);
    function spot(near: number, far: number) {
      const z = -(near + Math.pow(rand(), 1.4) * (far - near));
      const half = ((w / 2 + 160) * mpp * -z) / D_REF;
      return [(rand() * 2 - 1) * half, z];
    }
    // On narrow pages the view is only a few metres wide, so rocks shrink.
    const narrow = Math.min(1, Math.max(0.5, (w * mpp) / 7));
    const blobRows: number[][] = [];
    const branchRows: number[][] = [];
    const starRows: number[][] = [];
    // Reef patches: a few rocks with corals growing around them.
    for (let patch = 0; patch < 30; patch++) {
      const [x, z] = spot(3.4, 30);
      const rocks = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < rocks; i++) {
        // Rocks close to the camera stay small so they do not fill the view.
        const size =
          (0.25 + rand() * 0.7) * Math.min(1, 0.45 + -z / 14) * narrow;
        blobRows.push([
          x + (rand() - 0.5) * 2.2,
          z + (rand() - 0.5) * 1.6,
          size,
          rand() * 6.28,
          0,
          rand(),
          0.42 + rand() * 0.3,
          0.12,
        ]);
      }
      const domes = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < domes; i++) {
        blobRows.push([
          x + (rand() - 0.5) * 2.8,
          z + (rand() - 0.5) * 2,
          0.26 + rand() * 0.5,
          rand() * 6.28,
          1,
          rand(),
          0.6 + rand() * 0.3,
          0.25,
        ]);
      }
      const corals = 1 + Math.floor(rand() * 4);
      for (let i = 0; i < corals; i++) {
        branchRows.push([
          x + (rand() - 0.5) * 2.6,
          z + (rand() - 0.5) * 2,
          0.7 + rand() * 1.1,
          rand() * 6.28,
          2,
          rand(),
          1,
          0,
        ]);
      }
    }
    for (let i = 0; i < 20; i++) {
      const [x, z] = spot(2.6, 11);
      starRows.push([x, z, 0.1 + rand() * 0.07, rand() * 6.28, 3, 0, 1, -0.05]);
    }
    setInstances(blobs, blobRows);
    setInstances(branches, branchRows);
    setInstances(stars, starRows);
  }

  return { blobs, branches, stars, layout };
}
