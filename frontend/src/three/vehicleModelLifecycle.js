/**
 * Lifecycle helpers for cloned vehicle scenes.
 *
 * VehicleModel clones materials because they are owned by the configurator
 * instance. Geometry and textures remain shared with the drei GLTF cache.
 */

export function disposeOwnedVehicleMaterials(scene) {
  if (!scene?.traverse) return;

  const disposed = new Set();
  scene.traverse((node) => {
    if (!node?.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (!material || disposed.has(material) || typeof material.dispose !== 'function') return;
      disposed.add(material);
      material.dispose();
    });
  });
}
