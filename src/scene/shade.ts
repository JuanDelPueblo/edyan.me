import * as THREE from "three";

// A shadow map baked from the sun's side: the depth of whatever a scene
// holds on layer 1, inside a box. It is drawn only when the layout changes.
// Shaders compare against it through a shadow sampler (shadeAt in glsl.ts).
export function createShade(size: number) {
  const texture = new THREE.DepthTexture(size, size, THREE.UnsignedShortType);
  // With a compare function the sampler returns lit or shadowed, blended
  // over 2 x 2 texels.
  texture.compareFunction = THREE.LessEqualCompare;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  // The colour attachment is required but never read, so it gets the
  // smallest format.
  const target = new THREE.WebGLRenderTarget(size, size, {
    format: THREE.RedFormat,
    depthTexture: texture,
  });
  const camera = new THREE.OrthographicCamera();
  camera.layers.set(1);
  const center = new THREE.Vector3();
  const corner = new THREE.Vector3();

  // Draws the casters inside the box as lit from the given direction, and
  // sets the matrix that takes world space to map space. Returns the size
  // of one texel in metres.
  function bake(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    box: THREE.Box3,
    toSun: THREE.Vector3,
    matrix: THREE.Matrix4,
  ) {
    box.getCenter(center);
    camera.position.copy(center).add(toSun);
    camera.lookAt(center);
    camera.updateMatrixWorld();
    // Fit the camera's box around the corners as it sees them.
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < 8; i++) {
      corner
        .set(
          i & 1 ? box.max.x : box.min.x,
          i & 2 ? box.max.y : box.min.y,
          i & 4 ? box.max.z : box.min.z,
        )
        .applyMatrix4(camera.matrixWorldInverse);
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], corner.getComponent(axis));
        max[axis] = Math.max(max[axis], corner.getComponent(axis));
      }
    }
    camera.left = min[0];
    camera.right = max[0];
    camera.bottom = min[1];
    camera.top = max[1];
    // The camera looks down its negative z axis.
    camera.near = -max[2];
    camera.far = -min[2];
    camera.updateProjectionMatrix();
    // Clip space -1..1 to texture space 0..1.
    matrix
      .set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
      .multiply(camera.projectionMatrix)
      .multiply(camera.matrixWorldInverse);
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    return Math.max(max[0] - min[0], max[1] - min[1]) / size;
  }

  return { texture, bake };
}
