const EMPTY_RUNTIME_CONFIGURATION = {
  variantId: null,
  paintId: null,
  wheelId: null,
  interiorId: null,
  roofId: null,
  accessoryIds: [],
  assetVersion: null,
  supportedInteractions: [],
};

function normalizeIdentifier(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];

  return [...new Set(
    value
      .filter((item) => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim()),
  )];
}

export function projectRuntimeConfiguration(purchasable = {}, asset = {}) {
  return {
    variantId: normalizeIdentifier(purchasable.variantId),
    paintId: normalizeIdentifier(purchasable.paintId),
    wheelId: normalizeIdentifier(purchasable.wheelId),
    interiorId: normalizeIdentifier(purchasable.interiorId),
    roofId: normalizeIdentifier(purchable.roofId),
    accessoryIds: normalizeStringList(purchasable.accessoryIds),
    assetVersion: normalizeIdentifier(asset.version),
    supportedInteractions: normalizeStringList(asset.supportedInteractions),
  };
}

export function createEmptyRuntimeConfiguration() {
  return {
    ...EMPTY_RUNTIME_CONFIGURATION,
    accessoryIds: [],
    supportedInteractions: [],
  };
}
