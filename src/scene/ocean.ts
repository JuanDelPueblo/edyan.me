import * as THREE from "three";
import { common, waves } from "./glsl";
import { makeMaterial, U } from "./view";

const oceanVertex = /* glsl */ `
varying vec3 vW;
void main() {
  vW = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}
`;

// The surface seen from just above: mostly a rippled mirror of the sky, with
// turquoise showing through close to the camera and glitter under the sun.
// The camera sits so low that a pixel near the horizon covers metres of
// water. Waves too fine for a pixel are left out of its normal and counted
// as roughness instead, which blurs the reflection and widens the glitter.
const oceanFragment = /* glsl */ `
${common}
${waves}
uniform sampler2D tRefl;
uniform vec2 uReflMap;
uniform vec2 uGrain; // streaks per unit of view tangent: across, down
uniform vec3 uSunDir;
uniform float uTime;
varying vec3 vW;
void main() {
  vec3 toCam = cameraPosition - vW;
  float dist = length(toCam);
  vec3 view = toCam / dist;
  vec2 fx = dFdx(vW.xz);
  vec2 fy = dFdy(vW.xz);
  float lost;
  vec2 slope = waveSlopeOver(vW.xz, uTime, fx, fy, lost);
  // Fine ripples, about a third of a metre across.
  float reach = 3.1 * (length(fx) + length(fy));
  float keep = 1.0 / (1.0 + reach * reach);
  slope += (vec2(vnoise(vW.xz * 3.1 + uTime * 0.6), vnoise(vW.zx * 3.3 - uTime * 0.5)) - 0.5)
    * 0.16 * keep;
  lost += 0.0016 * (1.0 - keep * keep);
  slope *= 1.6;
  float rough = 1.6 * sqrt(lost);

  // Of the waves a pixel cannot show, the faces turned to the camera are
  // the ones in sight, so the normal leans that way. Left smooth, that
  // water would be a blur, so the lean varies in streaks a few pixels
  // tall: ripples of the lost strength at a size the pixels can show. The
  // streaks are laid out by screen row and by position across the water
  // at that row. Neither changes for a point on the water while the
  // camera slides sideways, so the streaks stay fixed to the water.
  float ahead = cameraPosition.z - vW.z;
  vec2 cell = vec2(vW.x, cameraPosition.y) / ahead * uGrain;
  float streak = 0.62 * vnoise(cell + uTime * vec2(0.12, 0.5))
    + 0.38 * vnoise(cell * vec2(1.9, 2.3) - uTime * vec2(0.2, 0.7));
  vec2 near = normalize(toCam.xz);
  streak = smoothstep(0.22, 0.78, streak);
  vec2 lean = near * rough * (0.5 + 2.6 * (streak - 0.5));
  vec3 n = normalize(vec3(lean.x - slope.x, 1.0, lean.y - slope.y));
  vec3 r = reflect(-view, n);
  r.y = abs(r.y);
  vec2 rt = r.xy / max(-r.z, 0.05);
  vec2 uv = vec2(rt.x * uReflMap.x + 0.5, rt.y * uReflMap.y);
  // Rough water mirrors a tall strip of the sky: four taps up the mirror,
  // each from a mip level as coarse as the gap between them.
  float spread = 0.5 * rough * uReflMap.y;
  float lod = log2(max(spread * 0.25 * float(textureSize(tRefl, 0).y), 1.0));
  vec3 refl = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec2 at = uv + vec2(0.0, spread * (float(i) * 0.25 - 0.375));
    refl += textureLod(tRefl, clamp(at, 0.003, 0.997), lod).rgb;
  }
  refl = min(refl * 0.25, vec3(0.94));

  float fres = 0.02 + 0.98 * pow(1.0 - clamp(dot(n, view), 0.0, 1.0), 5.0);
  vec3 body = mix(S(0.08, 0.74, 0.94), S(0.01, 0.30, 0.80),
    smoothstep(3.0, 70.0, dist));
  vec3 col = mix(body, refl, clamp(fres, 0.0, 1.0));

  // Sun glitter: the share of the water in this pixel that is tilted just
  // right to mirror the sun. Calm water gives a small bright image, rough
  // water a wide dim one broken into sparkles.
  vec3 h = normalize(view + uSunDir);
  vec2 off = h.xz / h.y + slope;
  float var = rough * rough * 0.5 + 0.0005;
  float hit = exp(-dot(off, off) / (2.0 * var));
  // Sparkles are about two pixels across at any distance.
  float sparkle = vnoise(cell * vec2(14.0, 1.25) + uTime * vec2(0.4, 1.1));
  col += S(1.0, 0.97, 0.86) * hit
    * (0.0016 / var + 5.0 * smoothstep(0.55, 0.9, sparkle));
  // Away from the sun the same sparkles catch the bright sky, faintly.
  col += refl * smoothstep(0.8, 0.95, sparkle) * rough * 5.0;
  col = mix(col, S(0.62, 0.88, 1.0), smoothstep(40.0, 1200.0, dist) * 0.6);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createOcean(reflection: THREE.Texture) {
  const geo = new THREE.BufferGeometry();
  const far = 7000;
  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([
        -far,
        0,
        0,
        far,
        0,
        0,
        far,
        0,
        -far,
        -far,
        0,
        0,
        far,
        0,
        -far,
        -far,
        0,
        -far,
      ]),
      3,
    ),
  );
  const mesh = new THREE.Mesh(
    geo,
    makeMaterial({
      vertexShader: oceanVertex,
      fragmentShader: oceanFragment,
      uniforms: {
        tRefl: { value: reflection },
        uReflMap: { value: new THREE.Vector2(1, 1) },
        uGrain: { value: new THREE.Vector2(30, 300) },
        uSunDir: U.uSunDir,
        uTime: U.uTime,
      },
    }),
  );
  mesh.frustumCulled = false;
  return mesh;
}
