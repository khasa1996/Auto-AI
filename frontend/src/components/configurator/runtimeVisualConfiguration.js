function hasMapping(mappings, id) {
  return Boolean(
    id
    && mappings
    && typeof mappings === 'object'
    && !Array.isArray(mappings)
    && Object.prototype.hasOwnProperty.call(mappings, id),
  );
}

function normalizeId(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeMappedList(value, mappings) {
  if (!Array.isArray(value) || !mappings || typeof mappings !== 'object' || Array.isArray(mappings)) return [];
  return [...new Set(value
    .map(normalizeId)
    .filter((id) => hasMapping(mappings, id)))];
}

export function projectVerifiedVisualConfiguration(purchasable = {}, asset = {}) {
  const wheelMappings = asset.wheelMeshNames;
  const interiorMappings = asset.interiorMaterialMappings;
  const optionMappings = asset.optionMeshNames;
  const wheelId = normalizeId(purchasable.wheelId);
  const interiorId = normalizeId(purchasable.interiorId);
  const roofId = normalizeId(purchasable.roofId);

  return {
    variantId: normalizeId(purchasable.variantId),
    paintId: normalizeId(purchasable.paintId),
    wheelId: hasMapping(wheelMappings, wheelId) ? wheelId : null,
    interiorId: hasMapping(interiorMappings, interiorId) ? interiorId : null,
    roofId: hasMapping(optionMappings, roofId) ? roofId : null,
    accessoryIds: normalizeMappedList(purchasable.accessoryIds, optionMappings),
  };
}
