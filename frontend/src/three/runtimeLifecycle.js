const RUNTIME_OWNED_RESOURCE_FLAG = 'runtimeOwnedResource';

function markOwnedResource(resource) {
  if (!resource || (typeof resource !== 'object' && typeof resource !== 'function')) return;
  resource.userData = resource.userData || {};
  resource.userData[RUNTIME_OWNED_RESOURCE_FLAG] = true;
}

export function markRuntimeOwnedResources(resources) {
  for (const resource of resources || []) markOwnedResource(resource);
}

export function collectOwnedRuntimeResources(resources) {
  const owned = [];
  const seen = new Set();
  for (const resource of resources || []) {
    if (!resource?.userData?.[RUNTIME_OWNED_RESOURCE_FLAG] || seen.has(resource)) continue;
    seen.add(resource);
    owned.push(resource);
  }
  return owned;
}

export function disposeOwnedRuntimeResources(resources) {
  const seen = new Set();
  for (const resource of resources || []) {
    if (!resource?.userData?.[RUNTIME_OWNED_RESOURCE_FLAG] || seen.has(resource)) continue;
    seen.add(resource);
    try {
      resource.dispose?.();
    } catch {
      // Cleanup must not turn an unmount/replacement into a runtime failure.
    }
  }
}

export function markRuntimeOwnedMaterials(meshes) {
  for (const mesh of meshes || []) {
    if (!mesh?.isMesh) continue;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material) continue;
      material.userData = material.userData || {};
      material.userData.runtimeOwnedMaterial = true;
      markOwnedResource(material);
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
    try {
      material.dispose?.();
    } catch {
      // Cleanup must not turn an unmount/replacement into a runtime failure.
    }
  }
}
