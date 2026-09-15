export function markRuntimeOwnedMaterials(meshes) {
  for (const mesh of meshes || []) {
    if (!mesh?.isMesh) continue;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material) continue;
      material.userData = material.userData || {};
      material.userData.runtimeOwnedMaterial = true;
    }
  }
}

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
  const seen = new Set();
  for (const material of materials || []) {
    if (!material || seen.has(material)) continue;
    seen.add(material);
    material.dispose?.();
  }
}
