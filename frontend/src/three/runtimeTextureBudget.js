const MIPMAP_OVERHEAD = 1.33;

const MATERIAL_TEXTURE_KEYS = [
  'map',
  'aoMap',
  'alphaMap',
  'bumpMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
  'displacementMap',
  'emissiveMap',
  'iridescenceMap',
  'iridescenceThicknessMap',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
  'sheenColorMap',
  'sheenRoughnessMap',
  'specularColorMap',
  'specularIntensityMap',
  'thicknessMap',
  'transmissionMap',
];

function getTextureDimensions(texture) {
  const image = texture?.image;
  const width = Number(image?.width);
  const height = Number(image?.height);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

function collectTextures(meshes) {
  const textures = [];
  const seen = new Set();

  for (const mesh of meshes || []) {
    if (!mesh?.isMesh) continue;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material) continue;

      for (const key of MATERIAL_TEXTURE_KEYS) {
        const texture = material[key];
        if (!texture || seen.has(texture)) continue;
        seen.add(texture);
        textures.push(texture);
      }
    }
  }

  return textures;
}

export function estimateTextureMemoryBytes(textures) {
  return (textures || []).reduce((total, texture) => {
    const dimensions = getTextureDimensions(texture);
    if (!dimensions) return total;
    return total + Math.ceil(dimensions.width * dimensions.height * 4 * MIPMAP_OVERHEAD);
  }, 0);
}

export function inspectTextureBudget(meshes, maxBytes) {
  const textures = collectTextures(meshes);
  const estimatedBytes = estimateTextureMemoryBytes(textures);

  return {
    estimatedBytes,
    textureCount: textures.length,
    overBudget: estimatedBytes > maxBytes,
  };
}
