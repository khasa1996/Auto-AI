import { getVerifiedRuntimeCapabilities } from '../components/configurator/assetRuntimeCapabilities';

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
