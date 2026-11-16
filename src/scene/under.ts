import * as THREE from "three";
import { common, underwater, waves } from "./glsl";
import { backdropVertex, makeMaterial, screenTriangle, U } from "./view";

// Uniforms every underwater material needs.
export function underUniforms() {
  return {
    uTime: U.uTime,
    uCamDepth: U.uCamDepth,
    uFloorY: U.uFloorY,
    uSunU: U.uSunU,
  };
}

const backdropFragment = /* glsl */ `
${common}
${underwater}
varying vec2 vTan;
void main() {
  gl_FragColor = vec4(waterColor(normalize(vec3(vTan, -1.0))), 1.0);
}
`;

const worldVertex = /* glsl */ `
varying vec3 vW;
void main() {
  vW = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}
`;

// The surface from below. Seen at a shallow angle it mirrors the water
// beneath; ripples that tilt far enough let the bright sky through.
const ceilingFragment = /* glsl */ `
${common}
${waves}
${underwater}
varying vec3 vW;
void main() {
  vec3 ray = vW - cameraPosition;
  float dist = length(ray);
  ray /= dist;
  float detail = 1.0 / (1.0 + dist * 0.05);
  vec2 slope = waveSlope(vW.xz * 1.6, uTime, detail);
  slope += (vec2(vnoise(vW.xz * 2.3 + uTime * 0.5), vnoise(vW.zx * 2.1 - uTime * 0.4)) - 0.5)
    * 0.22 * detail;
  vec3 n = normalize(vec3(slope.x * 2.6, -1.0, slope.y * 2.6));
  float cosi = max(dot(-ray, n), 0.0);
  float through = 1.0 - 1.77 * (1.0 - cosi * cosi);
  vec3 mirror = waterColor(reflect(ray, n)) * 1.06;
  vec3 sky = S(0.78, 0.96, 1.0) * 1.7;
  vec3 col = mix(mirror, sky, smoothstep(-0.42, 0.1, through));
  float toSun = max(dot(normalize(vec3(-slope.x, 0.35, -slope.y)), uSunU), 0.0);
  col += S(0.80, 1.0, 1.0) * pow(toSun, 3.0) * 0.5 * detail;
  gl_FragColor = vec4(applyFog(col, vW), 1.0);
}
`;

const sandVertex = /* glsl */ `
${common}
${underwater}
varying vec3 vW;
void main() {
  vW = vec3(position.x, uFloorY + dune(position.xz), position.z);
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}
`;

const sandFragment = /* glsl */ `
${common}
${underwater}
varying vec3 vW;
void main() {
  vec2 p = vW.xz;
  float h = dune(p);
  vec3 n = vec3(-(dune(p + vec2(0.05, 0.0)) - h) / 0.05, 1.0,
    -(dune(p + vec2(0.0, 0.05)) - h) / 0.05);
  // Wind-ripple ridges across the sand.
  vec2 across = vec2(0.34, 0.94);
  float phase = dot(p, across) * 15.0 + fbm2(p * 0.7) * 6.0;
  n.xz += across * cos(phase) * 0.2;
  n = normalize(n);
  vec3 alb = mix(S(1.0, 0.95, 0.80), S(0.88, 0.82, 0.64), fbm2(p * 0.55));
  alb *= 0.96 + 0.08 * hash21(floor(p * 80.0));
  vec3 light = underLight(vW, n, 1.0);
  vec3 col = alb * light;
  // Grains that catch the light.
  col += light * step(0.994, hash21(floor(p * 140.0))) * 0.8;
  gl_FragColor = vec4(applyFog(col, vW), 1.0);
}
`;

export function createUnderwater() {
  const backdrop = new THREE.Mesh(
    screenTriangle(),
    makeMaterial({
      vertexShader: backdropVertex,
      fragmentShader: backdropFragment,
      uniforms: underUniforms(),
      depthWrite: false,
    }),
  );
  backdrop.frustumCulled = false;
  backdrop.renderOrder = -10;

  const ceilingGeo = new THREE.PlaneGeometry(300, 110);
  ceilingGeo.rotateX(Math.PI / 2);
  ceilingGeo.translate(0, 0, -52);
  const ceiling = new THREE.Mesh(
    ceilingGeo,
    makeMaterial({
      vertexShader: worldVertex,
      fragmentShader: ceilingFragment,
      uniforms: underUniforms(),
    }),
  );
  ceiling.frustumCulled = false;

  const sandGeo = new THREE.PlaneGeometry(200, 80, 100, 40);
  sandGeo.rotateX(-Math.PI / 2);
  sandGeo.translate(0, 0, -38);
  const sand = new THREE.Mesh(
    sandGeo,
    makeMaterial({
      vertexShader: sandVertex,
      fragmentShader: sandFragment,
      uniforms: underUniforms(),
    }),
  );
  // The bounding sphere of so large a plane always meets the frustum;
  // main.ts hides the sand while the seabed is out of view instead.
  sand.frustumCulled = false;

  return { backdrop, ceiling, sand };
}
