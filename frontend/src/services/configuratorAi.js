const CONTEXT_PREFIX = '__AUTO_AI_CONTEXT__';

export function buildConfiguratorAIIntent(variantId, rawRequest, fields = {}) {
  const { currentConfiguration, city, state, ...intentFields } = fields;
  const context = {};
  if (currentConfiguration) context.current_configuration = currentConfiguration;
  if (city) context.city = city;
  if (state) context.state = state;
  const contextLine = Object.keys(context).length ? `${CONTEXT_PREFIX}${JSON.stringify(context)}\n` : '';
  return {
    variant_id: variantId,
    raw_request: `${contextLine}${String(rawRequest || '')}`.slice(0, 2000),
    ...intentFields,
  };
}

export function getAIConfigurationSelection(response) {
  const payload = response?.data || response;
  if (!payload?.valid || !payload?.configuration) return null;
  return {
    purchasable: payload.configuration.purchasable,
    interaction: payload.configuration.interaction,
    price: payload.price || null,
    explanation: payload.explanation || '',
  };
}

export function getAIInteractionState(interaction = {}) {
  const doors = interaction.doors || {};
  const lighting = interaction.lighting || {};
  return {
    doors: {
      frontLeft: Boolean(doors.front_left),
      frontRight: Boolean(doors.front_right),
      rearLeft: Boolean(doors.rear_left),
      rearRight: Boolean(doors.rear_right),
    },
    hoodOpen: Boolean(interaction.hood_open),
    bootOpen: Boolean(interaction.boot_open),
    frunkOpen: Boolean(interaction.frunk_open),
    sunroofOpen: Boolean(interaction.sunroof_open),
    lighting: {
      headlights: Boolean(lighting.headlights),
      drl: Boolean(lighting.drl),
      taillights: Boolean(lighting.taillights),
      fog_lights: Boolean(lighting.fog_lights),
      left_indicator: Boolean(lighting.left_indicator),
      right_indicator: Boolean(lighting.right_indicator),
      hazard: Boolean(lighting.hazard),
      interior: Boolean(lighting.interior),
    },
    cameraPreset: interaction.camera_preset || null,
  };
}
