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
const oceanFragment = /* glsl */ `
${common}
${waves}
uniform sampler2D tRefl;
uniform vec2 uReflMap;
uniform vec3 uSunDir;
uniform float uTime;
varying vec3 vW;
void main() {
  vec3 toCam = cameraPosition - vW;
  float dist = length(toCam);
  vec3 view = toCam / dist;
  float detail = 1.0 / (1.0 + dist * 0.03);
  vec2 slope = waveSlope(vW.xz, uTime, detail);
  slope += (vec2(vnoise(vW.xz * 3.1 + uTime * 0.6), vnoise(vW.zx * 3.3 - uTime * 0.5)) - 0.5)
    * 0.16 * detail;
  vec3 n = normalize(vec3(-slope.x * 1.6, 1.0, -slope.y * 1.6));
  vec3 r = reflect(-view, n);
  r.y = abs(r.y);
  vec2 rt = r.xy / max(-r.z, 0.05);
  vec2 uv = vec2(rt.x * uReflMap.x + 0.5, rt.y * uReflMap.y);
  vec3 refl = texture2D(tRefl, clamp(uv, 0.003, 0.997)).rgb;
  refl = min(refl, vec3(0.94));

  float fres = 0.02 + 0.98 * pow(1.0 - clamp(dot(n, view), 0.0, 1.0), 5.0);
  vec3 body = mix(S(0.08, 0.74, 0.94), S(0.01, 0.30, 0.80),
    smoothstep(3.0, 70.0, dist));
  vec3 col = mix(body, refl, clamp(fres, 0.0, 1.0));

  // Sun glitter: separate sparkles rather than one bright sheet.
  float glint = max(dot(r, uSunDir), 0.0);
  float sparkle = vnoise(vec2(vW.x / dist * 500.0, log(dist) * 16.0)
    + uTime * vec2(0.4, 1.1));
  col += S(1.0, 0.97, 0.86)
    * (pow(glint, 1200.0) * 6.0 * smoothstep(0.5, 0.85, sparkle)
      + pow(glint, 60.0) * 0.04);
  col = mix(col, S(0.62, 0.88, 1.0), smoothstep(250.0, 3500.0, dist) * 0.6);
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
        uSunDir: U.uSunDir,
        uTime: U.uTime,
      },
    }),
  );
  mesh.frustumCulled = false;
  return mesh;
}
