const VERIFIED_INTERACTIONS = new Set([
  'camera_exterior',
  'camera_interior',
  'doors',
  'hood',
  'boot',
  'frunk',
  'sunroof',
  'headlights',
  'drl',
  'taillights',
  'fog_lights',
  'left_indicator',
  'right_indicator',
  'hazard',
  'interior_lights',
]);

const CAMERA_PRESETS = new Set([
  'exterior',
  'front',
  'rear',
  'left',
  'right',
  'top',
  'wheel',
  'boot',
  'interior',
  'cockpit',
]);

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validAssetUrl(url) {
  if (!nonEmptyString(url)) return false;
  const normalized = url.trim().toLowerCase();
  return normalized.endsWith('.glb') || normalized.endsWith('.gltf');
}

function cleanStringList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(nonEmptyString).map((item) => item.trim()))];
}

function cleanStringMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([key, mappedName]) => nonEmptyString(key) && nonEmptyString(mappedName))
      .map(([key, mappedName]) => [key.trim(), mappedName.trim()]),
  );
}

function cleanMeshMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, mappedNames]) => nonEmptyString(key) && Array.isArray(mappedNames))
      .map(([key, mappedNames]) => [
        key.trim(),
        [...new Set(mappedNames.filter(nonEmptyString).map((name) => name.trim()))],
      ])
      .filter(([, mappedNames]) => mappedNames.length > 0),
  );
}

export function isRuntimeAssetUsable(asset) {
  return Boolean(
    asset
    && asset.available === true
    && validAssetUrl(asset.url)
    && nonEmptyString(asset.version),
  );
}

export function getVerifiedRuntimeCapabilities(asset = {}) {
  return {
    supportedInteractions: cleanStringList(asset.supportedInteractions)
      .filter((interaction) => VERIFIED_INTERACTIONS.has(interaction)),
    paintMaterialNames: cleanStringList(asset.paintMaterialNames),
    interiorMaterialNames: cleanStringList(asset.interiorMaterialNames),
    wheelMeshNames: cleanStringMap(asset.wheelMeshNames),
    optionMeshNames: cleanMeshMap(asset.optionMeshNames),
    cameraPresetNames: cleanStringList(asset.cameraPresetNames)
      .filter((preset) => CAMERA_PRESETS.has(preset)),
    animationNames: cleanStringList(asset.animationNames),
  };
}

export function filterCameraPresets(presets, declaredPresetNames) {
  const declared = new Set(cleanStringList(declaredPresetNames).filter((preset) => CAMERA_PRESETS.has(preset)));
  if (!Array.isArray(presets)) return [];
  return presets.filter((preset) => declared.has(preset));
}

export function getVerifiedMappings(asset = {}, inspectedAsset = {}) {
  const materialNames = new Set(cleanStringList(inspectedAsset.materialNames));
  const meshNames = new Set(cleanStringList(inspectedAsset.meshNames));
  const paintMaterialNames = cleanStringList(asset.paintMaterialNames)
    .filter((name) => materialNames.size === 0 || materialNames.has(name));
  const interiorMaterialNames = cleanStringList(asset.interiorMaterialNames)
    .filter((name) => materialNames.size === 0 || materialNames.has(name));
  const wheelMeshNames = Object.fromEntries(
    Object.entries(cleanStringMap(asset.wheelMeshNames))
      .filter(([, meshName]) => meshNames.size === 0 || meshNames.has(meshName)),
  );
  const optionMeshNames = Object.fromEntries(
    Object.entries(cleanMeshMap(asset.optionMeshNames))
      .map(([optionId, names]) => [optionId, names.filter((name) => meshNames.size === 0 || meshNames.has(name))])
      .filter(([, names]) => names.length > 0),
  );

  return { paintMaterialNames, interiorMaterialNames, wheelMeshNames, optionMeshNames };
}
