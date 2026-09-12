const INTERACTION_CAPABILITIES = {
  Door_FL_Open: 'doors',
  Door_FR_Open: 'doors',
  Door_RL_Open: 'doors',
  Door_RR_Open: 'doors',
  Hood_Open: 'hood',
  Boot_Open: 'boot',
  Frunk_Open: 'frunk',
  Sunroof_Open: 'sunroof',
  Headlights: 'headlights',
  DRL: 'drl',
  Taillights: 'taillights',
  Fog_lights: 'fog_lights',
  Left_indicator: 'left_indicator',
  Right_indicator: 'right_indicator',
  Hazard: 'hazard',
  Interior_lights: 'interior_lights',
};

export function buildPurchasablePayload(purchasable) {
  return {
    variant_id: purchasable.variantId,
    paint_id: purchasable.paintId,
    wheel_id: purchasable.wheelId,
    interior_id: purchasable.interiorId,
    roof_id: purchasable.roofId,
    accessory_ids: [...purchasable.accessoryIds],
  };
}

export function getOptionGroups(options) {
  const groups = [
    ['colors', 'Exterior colour', 'single'],
    ['wheels', 'Wheels', 'single'],
    ['interiors', 'Interior', 'single'],
    ['roofs', 'Roof', 'single'],
    ['accessories', 'Accessories', 'multi'],
  ];

  return groups
    .filter(([key]) => Array.isArray(options?.[key]) && options[key].length > 0)
    .map(([key, label, selection]) => ({ key, label, selection, options: options[key] }));
}

export function getValidationMessages(result) {
  return {
    errors: Array.isArray(result?.errors) ? result.errors.filter(Boolean) : [],
    warnings: Array.isArray(result?.warnings) ? result.warnings.filter(Boolean) : [],
  };
}

export function isInteractionSupported(supportedInteractions, interaction) {
  if (!Array.isArray(supportedInteractions)) return false;
  const capability = INTERACTION_CAPABILITIES[interaction] || interaction;
  return supportedInteractions.includes(capability);
}
