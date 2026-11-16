import * as THREE from "three";
import { common } from "./glsl";
import { makeMaterial, screenTriangle, U } from "./view";

const passVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Keeps only the brightest parts of the frame for the glow.
const brightFragment = /* glsl */ `
uniform sampler2D tMap;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tMap, vUv + uTexel * vec2(-0.5, -0.5)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(0.5, -0.5)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(-0.5, 0.5)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(0.5, 0.5)).rgb;
  c = min(c * 0.25, vec3(12.0));
  float peak = max(c.r, max(c.g, c.b));
  float keep = smoothstep(0.82, 1.5, peak);
  gl_FragColor = vec4(c * keep, 1.0);
}
`;

const downFragment = /* glsl */ `
uniform sampler2D tMap;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tMap, vUv).rgb * 4.0;
  c += texture2D(tMap, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(-1.0, 1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  gl_FragColor = vec4(c / 8.0, 1.0);
}
`;

const upFragment = /* glsl */ `
uniform sampler2D tMap;
uniform sampler2D tAdd;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tMap, vUv + uTexel * vec2(-1.0, 0.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(1.0, 0.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(0.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(0.0, 1.0)).rgb;
  c *= 2.0;
  c += texture2D(tMap, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(-1.0, 1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  gl_FragColor = vec4(c / 12.0 + texture2D(tAdd, vUv).rgb, 1.0);
}
`;

// Last pass: bends the picture along the waterline, draws the glassy line
// itself, light shafts under the surface and the lens flare, then converts
// to sRGB.
const finalFragment = /* glsl */ `
${common}
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform vec2 uSize; // canvas size, CSS px
uniform float uPx; // CSS px per device px
uniform float uTop; // page row of the canvas top
uniform float uWl; // page row of the waterline
uniform float uTime;
uniform vec2 uSun; // page position of the sun
uniform vec2 uCenter; // page position of the viewport centre
uniform float uFlare;
uniform float uSunSize;
uniform float uDeep; // 0 near the surface, 1 far below

float lineWave(float x, float t) {
  return sin(x * 0.011 + t * 0.9) * 3.2
    + sin(x * 0.027 - t * 1.4) * 1.9
    + sin(x * 0.063 + t * 2.1) * 0.9;
}

vec3 ghost(vec2 page, float along, float size, vec3 tint, float rim) {
  vec2 at = uSun + (uCenter - uSun) * along;
  float r = distance(page, at) / size;
  float disc = smoothstep(1.0, 0.86, r);
  return tint * disc * mix(1.0, smoothstep(0.35, 1.0, r), rim);
}

void main() {
  vec2 page = vec2(gl_FragCoord.x * uPx, uTop + uSize.y - gl_FragCoord.y * uPx);
  float wave = lineWave(page.x, uTime);
  float off = page.y - uWl;
  float row = page.y - wave * exp(-abs(off) / 36.0);
  float below = max(row - uWl, 0.0);

  // Slow refraction wobble under the surface.
  float wobble = smoothstep(0.0, 40.0, below) * exp(-below / 1400.0);
  float dx = sin(page.y * 0.041 + uTime * 1.2 + sin(page.x * 0.017 + uTime * 0.6) * 2.0)
    * 1.5 * wobble;
  vec2 uv = vec2((page.x + dx) / uSize.x, 1.0 - (row - uTop) / uSize.y);
  vec3 col = texture2D(tScene, uv).rgb + texture2D(tBloom, uv).rgb * 0.5;

  // Light shafts fanning down from above the surface.
  vec2 q = vec2(page.x - uSun.x - 60.0, row - uWl + 560.0);
  float ang = atan(q.x, q.y);
  float rays = smoothstep(0.38, 0.92, vnoise(vec2(ang * 34.0 + uTime * 0.10, uTime * 0.06))) * 0.6;
  rays += smoothstep(0.45, 0.95, vnoise(vec2(ang * 81.0 - uTime * 0.15, 3.0 + uTime * 0.05))) * 0.4;
  float shaft = smoothstep(0.0, 70.0, below) * exp(-below / 1300.0);
  shaft *= exp(-abs(ang) * 1.1) * step(0.0, row - uWl);
  col += S(0.72, 0.96, 1.0) * rays * shaft * 0.34;

  // The waterline: a bright core, mist above, a cyan glow and a blue lip
  // below.
  float m = page.y - uWl - wave;
  float core = exp(-m * m / 9.0);
  float under = step(0.0, m);
  col += vec3(0.85, 0.95, 1.0) * exp(min(m, 0.0) / 15.0) * (1.0 - under) * 0.32;
  col = mix(col, S(0.82, 0.97, 1.0) * 1.05, under * exp(-m / 7.0) * 0.8);
  float lip = under * smoothstep(5.0, 15.0, m) * exp(-max(m - 15.0, 0.0) / 12.0);
  col = mix(col, S(0.04, 0.36, 0.68), lip * 0.4);
  col = mix(col, vec3(1.3), core * 0.92);
  float glint = pow(vnoise(vec2(page.x * 0.09 + uTime * 0.9, uTime * 0.6)), 7.0);
  col += vec3(2.5) * glint * exp(-m * m / 30.0);

  // Lens flare along the line from the sun through the viewport centre.
  if (uFlare > 0.001) {
    vec3 f = vec3(0.0);
    f += ghost(page, 0.32, 26.0, S(0.55, 0.90, 1.0), 0.6) * 0.10;
    f += ghost(page, 0.55, 58.0, S(0.45, 1.0, 0.70), 0.9) * 0.07;
    f += ghost(page, 0.78, 14.0, S(1.0, 0.85, 0.45), 0.0) * 0.14;
    f += ghost(page, 1.08, 92.0, S(0.50, 0.70, 1.0), 0.95) * 0.07;
    f += ghost(page, 1.36, 34.0, S(1.0, 0.60, 0.80), 0.5) * 0.08;
    f += ghost(page, 1.72, 130.0, S(0.60, 1.0, 0.95), 0.97) * 0.06;
    vec2 s = page - uSun;
    float rs = length(s);
    float rh = rs / uSunSize;
    float ring = (rh - 132.0) / 11.0;
    float halo = exp(-ring * ring);
    f += mix(S(1.0, 0.55, 0.35), S(0.45, 0.75, 1.0), smoothstep(120.0, 144.0, rh)) * halo * 0.07;
    f += S(0.65, 0.85, 1.0) * exp(-abs(s.y) / 2.6) * exp(-abs(s.x) / 380.0) * 0.55;
    float star = pow(abs(cos(atan(s.y, s.x) * 3.0 + 0.4)), 90.0);
    f += S(1.0, 0.97, 0.88) * star * exp(-rh / 95.0) * 0.6;
    col += f * uFlare;
  }

  // Grade: a little extra saturation and a soft shoulder, no filmic curve.
  col = max(col, 0.0);
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(luma), col, 1.1), 0.0);
  col = mix(col, 1.0 - exp(-col * 1.25), smoothstep(0.55, 1.5, col));
  col = pow(col, vec3(1.0 / 2.2));
  col += (hash21(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createPost(renderer: THREE.WebGLRenderer, hdr: boolean) {
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const mesh = new THREE.Mesh(screenTriangle());
  mesh.frustumCulled = false;
  scene.add(mesh);

  function pass(
    fragmentShader: string,
    uniforms: Record<string, THREE.IUniform>,
  ) {
    return makeMaterial({
      vertexShader: passVertex,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
  }
  const bright = pass(brightFragment, {
    tMap: { value: null },
    uTexel: { value: new THREE.Vector2() },
  });
  const down = pass(downFragment, {
    tMap: { value: null },
    uTexel: { value: new THREE.Vector2() },
  });
  const up = pass(upFragment, {
    tMap: { value: null },
    tAdd: { value: null },
    uTexel: { value: new THREE.Vector2() },
  });
  const final = pass(finalFragment, {
    tScene: { value: null },
    tBloom: { value: null },
    uSize: { value: new THREE.Vector2() },
    uPx: { value: 1 },
    uTop: { value: 0 },
    uWl: { value: 0 },
    uTime: { value: 0 },
    uSun: { value: new THREE.Vector2() },
    uCenter: { value: new THREE.Vector2() },
    uFlare: { value: 1 },
    uSunSize: U.uSunSize,
    uDeep: { value: 0 },
  });

  const levels = 5;
  let downs: THREE.WebGLRenderTarget[] = [];
  let ups: THREE.WebGLRenderTarget[] = [];

  function target(width: number, height: number) {
    return new THREE.WebGLRenderTarget(width, height, {
      type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType,
      depthBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
  }

  function resize(width: number, height: number) {
    for (const t of downs) t.dispose();
    for (const t of ups) t.dispose();
    downs = [];
    ups = [];
    let w = width;
    let h = height;
    for (let i = 0; i < levels; i++) {
      w = Math.max(2, Math.round(w / 2));
      h = Math.max(2, Math.round(h / 2));
      downs.push(target(w, h));
      if (i < levels - 1) ups.push(target(w, h));
    }
  }

  function draw(
    mat: THREE.ShaderMaterial,
    out: THREE.WebGLRenderTarget | null,
  ) {
    mesh.material = mat;
    renderer.setRenderTarget(out);
    renderer.render(scene, camera);
  }

  function render(source: THREE.WebGLRenderTarget) {
    bright.uniforms.tMap.value = source.texture;
    bright.uniforms.uTexel.value.set(1 / source.width, 1 / source.height);
    draw(bright, downs[0]);
    for (let i = 1; i < levels; i++) {
      down.uniforms.tMap.value = downs[i - 1].texture;
      down.uniforms.uTexel.value.set(
        1 / downs[i - 1].width,
        1 / downs[i - 1].height,
      );
      draw(down, downs[i]);
    }
    let from = downs[levels - 1];
    for (let i = levels - 2; i >= 0; i--) {
      up.uniforms.tMap.value = from.texture;
      up.uniforms.tAdd.value = downs[i].texture;
      up.uniforms.uTexel.value.set(1 / from.width, 1 / from.height);
      draw(up, ups[i]);
      from = ups[i];
    }
    final.uniforms.tScene.value = source.texture;
    final.uniforms.tBloom.value = from.texture;
    draw(final, null);
  }

  return { resize, render, uniforms: final.uniforms };
}
