/**
 * Runtime lifecycle helpers for cloned Three.js resources.
 *
 * The GLTF loader may cache source scene resources. Only resources explicitly
 * marked as runtime-owned by our clone step are eligible for disposal.
 */

export function collectOwnedMaterialResources(meshes) {
  const owned = [];
  const seen = new Set();

  for (const mesh of meshes || []) {
    if (!mesh?.isMesh) continue;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material?.userData?.runtimeOwnedMaterial || seen.has(material)) continue;
      seen.add(material);
      owned.push(material);
    }
  }

  return owned;
}

export function disposeOwnedMaterialResources(materials) {
  for (const material of materials || []) {
    material?.dispose?.();
  }
}
