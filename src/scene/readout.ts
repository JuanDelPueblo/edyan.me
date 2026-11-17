// Development readout in the page corner: quality level, frame pace, time
// spent on a frame, and the draw calls and triangles of that frame.
import type * as THREE from "three";

export function createReadout(renderer: THREE.WebGLRenderer) {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  // Counts add up over every pass of a frame instead of restarting per pass.
  renderer.info.autoReset = false;
  const box = document.createElement("pre");
  box.className = "scene-readout";
  box.style.cssText =
    "position:fixed;left:8px;bottom:8px;z-index:99;margin:0;padding:4px 6px;background:#000a;color:#fff;font:11px monospace;pointer-events:none";
  document.body.append(box);

  // GPU time, where the browser allows measuring it. One query runs at a
  // time; its result arrives a few frames later.
  const timer = gl.getExtension("EXT_disjoint_timer_query_webgl2");
  let query: WebGLQuery | null = null;
  let timing = false;
  let gpu = 0;
  let cpu = 0;
  let startedAt = 0;
  let shownAt = 0;

  function begin() {
    renderer.info.reset();
    startedAt = performance.now();
    if (timer && !query) {
      query = gl.createQuery();
      gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
      timing = true;
    }
  }

  function end(level: number, pace: number) {
    const now = performance.now();
    cpu += (now - startedAt - cpu) * 0.1;
    if (timer && timing) {
      gl.endQuery(timer.TIME_ELAPSED_EXT);
      timing = false;
    } else if (
      timer &&
      query &&
      gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)
    ) {
      const ms = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6;
      // A disjoint result was interrupted and is not valid.
      if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) gpu += (ms - gpu) * 0.2;
      gl.deleteQuery(query);
      query = null;
    }
    if (now - shownAt < 500) return;
    shownAt = now;
    const { calls, triangles } = renderer.info.render;
    box.textContent =
      `level ${level} · pace ${pace.toFixed(1)} ms · cpu ${cpu.toFixed(1)} ms · ` +
      `gpu ${timer ? gpu.toFixed(2) + " ms" : "n/a"} · ` +
      `${calls} calls · ${triangles} triangles`;
  }

  return { begin, end };
}
