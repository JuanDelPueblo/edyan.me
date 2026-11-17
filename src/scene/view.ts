import * as THREE from "three";

// Vertical field of view of one viewport height, shared by both cameras.
export const FOV = 50;
export const TAN = Math.tan((FOV / 2) * (Math.PI / 180));
// Underwater objects at this distance scroll 1:1 with the page.
export const D_REF = 6;
// Height of the above-water camera over the surface.
export const EYE = 0.4;

// Page measurements and derived values, refreshed every frame.
export interface View {
  w: number; // canvas width, CSS px
  h: number; // canvas height, CSS px
  lvh: number; // reference viewport height
  top: number; // page row of the canvas top
  scroll: number;
  wl: number; // page row of the waterline
  hz: number; // page row of the horizon
  left: number; // left edge of the content column
  orbLeft: number; // header orb: left edge and bottom row
  orbBottom: number;
  k: number; // view-space tangent per CSS px
  mpp: number; // metres per CSS px at D_REF
  pr: number; // device px per CSS px
  time: number;
  dt: number;
  camX: number;
  camY: number;
  floorY: number;
  layout: number; // increments when sizes change
  seaTop: number; // page row of the top of the underwater camera's frame
  // Page rectangle hidden behind the content panel: left, top, right,
  // bottom. All zero when nothing is hidden.
  cover: number[];
}

// Uniforms shared by several materials. Materials reference these objects
// directly, so one assignment updates every shader.
export const U = {
  uTime: { value: 0 },
  uCamDepth: { value: 1 },
  // Direction to the sun below and above the surface.
  uSunU: { value: new THREE.Vector3(0.35, 0.85, 0.4).normalize() },
  uSunDir: { value: new THREE.Vector3(0.5, 0.2, -1).normalize() },
  uLight: { value: new THREE.Vector3(0.5, 0.6, -0.3).normalize() },
  // x: CSS px per device px, y: page row of the canvas bottom,
  // z: 1 while the pass draws straight to the page.
  uPage: { value: new THREE.Vector3(1, 0, 1) },
  // Page rectangle kept clear of bright sky features: x0, y0, x1, y1.
  uExcl: { value: new THREE.Vector4(0, 0, 0, 0) },
  uFloorY: { value: -10 },
  // Size of the sun's disc and glow; smaller on narrow pages.
  uSunSize: { value: 1 },
  // Baked shadow map of the island: the depth texture, the matrix from
  // world space into it, and x: the share of sunlight a shadow removes,
  // y: the size of one texel in metres.
  tLandShade: { value: null as THREE.Texture | null },
  uLandShadeMat: { value: new THREE.Matrix4() },
  uLandShade: { value: new THREE.Vector2(0.62, 0.1) },
  // The same for the reef. Its map is relative to the seabed.
  tReefShade: { value: null as THREE.Texture | null },
  uReefShadeMat: { value: new THREE.Matrix4() },
  uReefShade: { value: new THREE.Vector2(0.9, 0.04) },
  // 0 while the shadow maps are drawn, so plants cast from their rest pose.
  uSway: { value: 1 },
};

// Small seeded generator so the scene looks the same on every load.
export function rng(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One triangle that covers the whole target.
export function screenTriangle() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
      3,
    ),
  );
  return geo;
}

// Vertex shader for a full-target backdrop. vTan is the view ray as
// (x / -z, y / -z), which is linear across the screen for any frustum.
export const backdropVertex = /* glsl */ `
varying vec2 vTan;
void main() {
  vTan = vec2(
    (position.x + projectionMatrix[2][0]) / projectionMatrix[0][0],
    (position.y + projectionMatrix[2][1]) / projectionMatrix[1][1]
  );
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

// Fade factor near the page rectangle in uExcl: 0 inside, 1 well outside.
export const exclusion = /* glsl */ `
uniform vec3 uPage;
uniform vec4 uExcl;
float clearOfText() {
  if (uPage.z < 0.5) return 1.0;
  vec2 p = vec2(gl_FragCoord.x * uPage.x, uPage.y - gl_FragCoord.y * uPage.x);
  vec2 d = max(uExcl.xy - p, p - uExcl.zw);
  float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  return smoothstep(-6.0, 70.0, dist);
}
`;

// Concatenates non-indexed geometries, keeping the listed attributes.
export function mergeGeometries(
  parts: THREE.BufferGeometry[],
  names: string[],
) {
  const out = new THREE.BufferGeometry();
  for (const name of names) {
    const size = parts[0].getAttribute(name).itemSize;
    let count = 0;
    for (const part of parts) count += part.getAttribute(name).count;
    const data = new Float32Array(count * size);
    let at = 0;
    for (const part of parts) {
      const src = part.getAttribute(name).array;
      data.set(src, at);
      at += src.length;
    }
    out.setAttribute(name, new THREE.BufferAttribute(data, size));
  }
  return out;
}

// Adds a float attribute with the same value on every vertex.
export function fillAttribute(
  geo: THREE.BufferGeometry,
  name: string,
  values: number[],
) {
  const count = geo.getAttribute("position").count;
  const data = new Float32Array(count * values.length);
  for (let i = 0; i < count; i++) data.set(values, i * values.length);
  geo.setAttribute(name, new THREE.BufferAttribute(data, values.length));
}

// Builds a ShaderMaterial. Colours in the shaders are written as S(r, g, b)
// in sRGB; they are converted to linear constants here, once.
export function makeMaterial(params: THREE.ShaderMaterialParameters) {
  function linear(source: string | undefined) {
    return source?.replace(
      /S\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\)/g,
      (_, r, g, b) =>
        "vec3(" +
        [r, g, b]
          .map((c) => Math.pow(parseFloat(c), 2.2).toFixed(5))
          .join(", ") +
        ")",
    );
  }
  return new THREE.ShaderMaterial({
    ...params,
    vertexShader: linear(params.vertexShader),
    fragmentShader: linear(params.fragmentShader),
  });
}
