// GLSL shared by the scene's shaders. Colours are written as S(r, g, b) in
// sRGB and lit in linear light; makeMaterial() in view.ts converts them, and the
// final pass converts the picture back to sRGB.

export const common = /* glsl */ `
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
float fbm2(vec2 p) {
  return 0.62 * vnoise(p) + 0.38 * vnoise(p * 2.03 + vec2(17.1, 9.2));
}
float fbm(vec2 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s;
}
`;

// Share of the sunlight that reaches a point, from a depth map drawn from
// the sun's side (shade.ts). The point is given in the map's space. Each of
// the four taps is already blended over 2 x 2 texels by the sampler.
export const shade = /* glsl */ `
float shadeAt(sampler2DShadow map, vec3 at) {
  // Nothing casts onto points outside the map or nearer the sun than it
  // starts, which is most of the open water.
  vec2 edge = min(at.xy, 1.0 - at.xy);
  float inside = min(edge.x, edge.y);
  if (inside <= 0.0 || at.z <= 0.0) return 1.0;
  float r = 0.75 / float(textureSize(map, 0).x);
  float lit = texture(map, vec3(at.xy + vec2(-r, -r), at.z))
    + texture(map, vec3(at.xy + vec2(r, -r), at.z))
    + texture(map, vec3(at.xy + vec2(-r, r), at.z))
    + texture(map, vec3(at.xy + vec2(r, r), at.z));
  // Casters are cut off at the map's edge, so shadows fade out before it.
  return mix(1.0, lit * 0.25, smoothstep(0.0, 0.05, inside));
}
`;

// Sum of directional sine waves. Returns the surface slope (dh/dx, dh/dz);
// detail fades with the given factor so distant water does not shimmer.
export const waves = /* glsl */ `
vec2 waveSlope(vec2 p, float t, float detail) {
  vec2 s = vec2(0.0);
  vec2 d;
  d = vec2(0.86, 0.51);
  s += d * 0.050 * cos(dot(p, d) * 0.55 + t * 0.9);
  d = vec2(-0.42, 0.91);
  s += d * 0.045 * cos(dot(p, d) * 0.90 + t * 1.2);
  d = vec2(0.31, 0.95);
  s += d * 0.060 * detail * cos(dot(p, d) * 2.10 + t * 1.9);
  d = vec2(-0.77, 0.64);
  s += d * 0.060 * detail * cos(dot(p, d) * 3.70 + t * 2.6);
  d = vec2(0.97, -0.24);
  s += d * 0.050 * detail * detail * cos(dot(p, d) * 7.30 + t * 3.4);
  d = vec2(0.12, 0.99);
  s += d * 0.045 * detail * detail * cos(dot(p, d) * 11.9 + t * 4.3);
  return s;
}

// One wave averaged over a pixel. fx and fy are the change of p across the
// pixel; w holds the wave's slope, frequency and speed. A wave finer than
// the pixel fades out instead of flickering, and lost collects the slope
// variance that went with it.
vec2 waveOver(vec2 p, float t, vec2 fx, vec2 fy, vec2 d, vec3 w, inout float lost) {
  float span = w.y * (abs(dot(fx, d)) + abs(dot(fy, d)));
  float keep = exp(-span * span * 0.2);
  lost += w.x * w.x * 0.5 * (1.0 - keep * keep);
  return d * w.x * keep * cos(dot(p, d) * w.y + t * w.z);
}

// The waves of waveSlope for water seen from low above it, where a pixel
// near the horizon covers metres of water.
vec2 waveSlopeOver(vec2 p, float t, vec2 fx, vec2 fy, out float lost) {
  lost = 0.0;
  vec2 s = waveOver(p, t, fx, fy, vec2(0.86, 0.51), vec3(0.050, 0.55, 0.9), lost);
  s += waveOver(p, t, fx, fy, vec2(-0.42, 0.91), vec3(0.045, 0.90, 1.2), lost);
  s += waveOver(p, t, fx, fy, vec2(0.31, 0.95), vec3(0.060, 2.10, 1.9), lost);
  s += waveOver(p, t, fx, fy, vec2(-0.77, 0.64), vec3(0.060, 3.70, 2.6), lost);
  s += waveOver(p, t, fx, fy, vec2(0.97, -0.24), vec3(0.050, 7.30, 3.4), lost);
  s += waveOver(p, t, fx, fy, vec2(0.12, 0.99), vec3(0.045, 11.9, 4.3), lost);
  return s;
}
`;

// Everything lit below the surface: water colour by view direction and depth,
// distance fog into that colour, and sunlight with caustics.
export const underwater = /* glsl */ `
uniform float uTime;
uniform float uCamDepth;
uniform float uFloorY;
uniform vec3 uSunU;

// Height of the sand above uFloorY.
float dune(vec2 p) {
  return 0.34 * sin(p.x * 0.21 + 1.3) * cos(p.y * 0.17 + 0.4)
    + 0.20 * sin(p.x * 0.47 + p.y * 0.33 + 2.0)
    + 0.07 * sin(p.y * 0.90 - p.x * 0.50);
}

// Tileable water caustic after Dave Hoskins.
float caustic(vec2 uv, float t) {
  const float TAU = 6.28318530718;
  vec2 p = mod(uv * TAU, TAU) - 250.0;
  vec2 i = p;
  float c = 1.0;
  const float inten = 0.005;
  for (int n = 0; n < 3; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(
      p.x / (sin(i.x + tt) / inten),
      p.y / (cos(i.y + tt) / inten)
    ));
  }
  c /= 3.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}

vec3 waterColor(vec3 dir) {
  float dk = exp(-uCamDepth * 0.05);
  vec3 top = mix(S(0.04, 0.38, 0.88), S(0.20, 0.74, 0.99), dk);
  vec3 mid = mix(S(0.02, 0.25, 0.76), S(0.05, 0.50, 0.94), dk);
  vec3 bot = mix(S(0.01, 0.14, 0.58), S(0.02, 0.30, 0.80), dk);
  vec3 c = mix(mid, top, smoothstep(0.0, 0.42, dir.y));
  c = mix(c, bot, smoothstep(0.0, -0.42, dir.y));
  float s = max(dot(dir, uSunU), 0.0);
  c += S(0.75, 0.95, 0.90) * (pow(s, 4.0) * 0.30 + pow(s, 24.0) * 0.45) * dk;
  return c;
}

vec3 applyFog(vec3 col, vec3 wpos) {
  vec3 v = wpos - cameraPosition;
  float d = length(v);
  float f = 1.0 - exp(-d * 0.048);
  return mix(col, waterColor(v / d), f);
}

float causticAt(vec3 wpos) {
  vec2 uv = (wpos.xz - uSunU.xz / max(uSunU.y, 0.25) * wpos.y) * 0.42;
  return caustic(uv, uTime * 0.5);
}

// Light arriving at a surface point: cyan light from above, a dimmer bounce
// from below, and the sun dappled by caustics. dapple scales the caustics;
// lit is the share of the sun left by shadows.
vec3 underLight(vec3 wpos, vec3 n, float dapple, float lit) {
  float att = mix(0.66, 1.0, exp(wpos.y * 0.05));
  float up = n.y * 0.5 + 0.5;
  vec3 amb = mix(S(0.22, 0.44, 0.62), S(0.50, 0.80, 0.92), up) * 0.9;
  float ndl = max(dot(n, uSunU), 0.0);
  float ca = min(causticAt(wpos), 1.6) * smoothstep(-0.3, 0.5, n.y) * dapple;
  vec3 sun = S(1.0, 0.98, 0.90) * (ndl * 0.42 + ca * 1.0) * lit;
  // Whatever blocks the sun hides part of the bright water above as well.
  return (amb * (0.7 + 0.3 * lit) + sun) * att;
}
`;

// Sunlight left near the seabed after the baked shadows of the reef and the
// plants; goes after the underwater block. The lookup starts a little off
// the surface, towards the sun, so a surface does not shadow itself.
export const reefShade = /* glsl */ `
${shade}
uniform sampler2DShadow tReefShade;
uniform mat4 uReefShadeMat;
uniform vec2 uReefShade;
float reefLit(vec3 wpos, vec3 n) {
  vec3 from = wpos - vec3(0.0, uFloorY, 0.0) + (n * 1.5 + uSunU) * uReefShade.y;
  float lit = shadeAt(tReefShade, (uReefShadeMat * vec4(from, 1.0)).xyz);
  return 1.0 - uReefShade.x * (1.0 - lit);
}
`;
