import { getVerifiedRuntimeCapabilities, isRuntimeAssetUsable } from '../components/configurator/assetRuntimeCapabilities';

function cleanAnimationMap(value, supportedInteractions) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter(([interaction, mappings]) => (
        supportedInteractions.includes(interaction)
        && mappings
        && typeof mappings === 'object'
        && !Array.isArray(mappings)
      ))
      .map(([interaction, mappings]) => [
        interaction,
        Object.fromEntries(
          Object.entries(mappings)
            .filter(([key, animationName]) => (
              typeof key === 'string'
              && key.trim().length > 0
              && typeof animationName === 'string'
              && animationName.trim().length > 0
            ))
            .map(([key, animationName]) => [key.trim(), animationName.trim()]),
        ),
      ])
      .filter(([, mappings]) => Object.keys(mappings).length > 0),
  );
}

export function buildVehicleRuntimeState(asset = {}) {
  const capabilities = getVerifiedRuntimeCapabilities(asset);

  return {
    ...capabilities,
    interactionAnimationNames: cleanAnimationMap(
      asset.interactionAnimationNames,
      capabilities.supportedInteractions,
    ),
  };
}

export function resolveRuntimeAsset(asset = {}) {
  if (!isRuntimeAssetUsable(asset)) return null;
  if (asset.version === 'runtime-props') return null;

  const runtime = buildVehicleRuntimeState(asset);
  return {
    ...asset,
    ...runtime,
  };
}

export function buildRuntimeNodeIndex(scene) {
  const index = new Map();
  if (!scene || typeof scene.traverse !== 'function') return index;

  scene.traverse((node) => {
    if (node && typeof node.name === 'string' && node.name.length > 0 && !index.has(node.name)) {
      index.set(node.name, node);
    }
  });

  return index;
}

export function buildRuntimeMaterialIndex(scene, allowedMaterialNames = []) {
  const index = new Map();
  if (!scene || typeof scene.traverse !== 'function') return index;

  const allowed = new Set(
    allowedMaterialNames
      .filter((name) => typeof name === 'string' && name.trim().length > 0)
      .map((name) => name.trim().toLowerCase()),
  );
  if (!allowed.size) return index;

  scene.traverse((node) => {
    if (!node?.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      const name = typeof material?.name === 'string' ? material.name.trim().toLowerCase() : '';
      if (!name || !allowed.has(name)) return;
      const existing = index.get(name) || [];
      existing.push(material);
      index.set(name, existing);
    });
  });

  return index;
}

export function resolveRuntimeMeshNodes(nodeIndex, mappings, selectedId) {
  if (!(nodeIndex instanceof Map) || !mappings || typeof mappings !== 'object' || !selectedId) return [];

  const configured = mappings[selectedId];
  const names = Array.isArray(configured) ? configured : [configured];

  return names
    .filter((name) => typeof name === 'string' && name.length > 0)
    .map((name) => nodeIndex.get(name))
    .filter(Boolean);
}

export function resolveRuntimeMeshSelection(nodeIndex, mappings, selectedId) {
  if (!(nodeIndex instanceof Map) || !mappings || typeof mappings !== 'object' || !selectedId) {
    return { matched: false, nodes: [] };
  }

  const hasConfiguredSelection = Object.prototype.hasOwnProperty.call(mappings, selectedId);
  if (!hasConfiguredSelection) return { matched: false, nodes: [] };

  const nodes = resolveRuntimeMeshNodes(nodeIndex, mappings, selectedId);
  return {
    matched: nodes.length > 0,
    nodes,
  };
}

export function applyRuntimeMeshVisibility(nodeIndex, selectedIds, mappings) {
  if (!(nodeIndex instanceof Map) || !mappings || typeof mappings !== 'object' || Array.isArray(mappings)) return;

  const mappedNames = new Set(
    Object.values(mappings)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((name) => typeof name === 'string' && name.length > 0),
  );
  if (!mappedNames.size) return;

  const selections = (selectedIds || [])
    .filter(Boolean)
    .map((selectedId) => resolveRuntimeMeshSelection(nodeIndex, mappings, selectedId))
    .filter(({ matched }) => matched);

  mappedNames.forEach((name) => {
    const node = nodeIndex.get(name);
    if (node) node.visible = false;
  });

  selections.forEach(({ nodes }) => {
    nodes.forEach((node) => { node.visible = true; });
  });
}

export function applyRuntimeInteriorMaterials(materialIndex, interiorMaterialNames, interiorMaterialMappings, selectedInteriorId) {
  if (!(materialIndex instanceof Map) || !Array.isArray(interiorMaterialNames) || !interiorMaterialMappings || !selectedInteriorId) return;

  const configured = interiorMaterialMappings[selectedInteriorId];
  if (!Array.isArray(configured) || configured.length === 0) return;

  const selectedNames = new Set(
    configured
      .filter((name) => typeof name === 'string' && name.trim())
      .map((name) => name.trim().toLowerCase()),
  );
  if (!selectedNames.size) return;

  const interiorNames = new Set(
    interiorMaterialNames
      .filter((name) => typeof name === 'string' && name.trim())
      .map((name) => name.trim().toLowerCase()),
  );

  interiorNames.forEach((name) => {
    const materials = materialIndex.get(name) || [];
    materials.forEach((material) => {
      if (!material.userData) material.userData = {};
      if (!material.userData.__autoAiInteriorBase) {
        material.userData.__autoAiInteriorBase = {
          transparent: Boolean(material.transparent),
          opacity: Number.isFinite(material.opacity) ? material.opacity : 1,
          depthWrite: material.depthWrite !== false,
        };
      }
      const base = material.userData.__autoAiInteriorBase;
      const selected = selectedNames.has(name);
      material.transparent = selected ? base.transparent : true;
      material.opacity = selected ? base.opacity : 0;
      material.depthWrite = selected ? base.depthWrite : false;
      material.needsUpdate = true;
    });
  });
}

function getSceneMaterialNames(scene) {
  const names = new Set();
  if (!scene || typeof scene.traverse !== 'function') return names;
  scene.traverse((node) => {
    if (!node?.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (typeof material?.name === 'string' && material.name.trim()) names.add(material.name.trim());
    });
  });
  return names;
}

function getSceneNodeNames(scene) {
  const names = new Set();
  if (!scene || typeof scene.traverse !== 'function') return names;
  scene.traverse((node) => {
    if (typeof node?.name === 'string' && node.name.trim()) names.add(node.name.trim());
  });
  return names;
}

function hasRenderableMesh(scene) {
  if (!scene || typeof scene.traverse !== 'function') return false;
  let found = false;
  scene.traverse((node) => {
    if (node?.isMesh) found = true;
  });
  return found;
}

function collectMappingNames(mappings) {
  if (!mappings || typeof mappings !== 'object' || Array.isArray(mappings)) return [];
  return Object.values(mappings)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((name) => typeof name === 'string' && name.trim())
    .map((name) => name.trim());
}

function collectAnimationNames(animationMappings) {
  if (!animationMappings || typeof animationMappings !== 'object' || Array.isArray(animationMappings)) return [];
  return Object.values(animationMappings)
    .filter((mapping) => mapping && typeof mapping === 'object' && !Array.isArray(mapping))
    .flatMap((mapping) => Object.values(mapping))
    .filter((name) => typeof name === 'string' && name.trim())
    .map((name) => name.trim());
}

export function validateLoadedRuntimeScene(manifest = {}, scene, animations = []) {
  const errors = [];
  if (!hasRenderableMesh(scene)) errors.push('Loaded GLB contains no renderable mesh.');

  const materialNames = getSceneMaterialNames(scene);
  const nodeNames = getSceneNodeNames(scene);
  const animationNames = new Set(
    (Array.isArray(animations) ? animations : [])
      .map((clip) => clip?.name)
      .filter((name) => typeof name === 'string' && name.trim())
      .map((name) => name.trim()),
  );

  const requiredMaterials = [
    ...(Array.isArray(manifest.paintMaterialNames) ? manifest.paintMaterialNames : []),
    ...(Array.isArray(manifest.interiorMaterialNames) ? manifest.interiorMaterialNames : []),
  ];
  requiredMaterials.forEach((name) => {
    if (typeof name === 'string' && name.trim() && !materialNames.has(name.trim())) {
      errors.push(`Missing manifest material: ${name.trim()}`);
    }
  });

  const requiredNodes = [
    ...collectMappingNames(manifest.wheelMeshNames),
    ...collectMappingNames(manifest.optionMeshNames),
  ];
  requiredNodes.forEach((name) => {
    if (!nodeNames.has(name)) errors.push(`Missing manifest mesh: ${name}`);
  });

  collectAnimationNames(manifest.interactionAnimationNames).forEach((name) => {
    if (!animationNames.has(name)) errors.push(`Missing manifest animation: ${name}`);
  });

  return { valid: errors.length === 0, errors };
}

export function canRenderLoadedRuntime(manifest = {}, scene, animations = []) {
  return validateLoadedRuntimeScene(manifest, scene, animations).valid;
}
