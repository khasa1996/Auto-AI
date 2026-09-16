const CONTEXT_PREFIX = '__AUTO_AI_CONTEXT__';

export function buildConfiguratorAIIntent(variantId, rawRequest, fields = {}) {
  const {
    currentConfiguration,
    city,
    state,
    authoritativePrice,
    verifiedAsset,
    clientPrice: _clientPrice,
    ...intentFields
  } = fields;
  const context = {};
  if (currentConfiguration) context.current_configuration = currentConfiguration;
  if (city) context.city = city;
  if (state) context.state = state;
  if (authoritativePrice) context.authoritative_price = authoritativePrice;
  if (verifiedAsset) context.verified_asset = verifiedAsset;
  const contextLine = Object.keys(context).length ? `${CONTEXT_PREFIX}${JSON.stringify(context)}\n` : '';
  return {
    variant_id: variantId,
    raw_request: `${contextLine}${String(rawRequest || '')}`.slice(0, 2000),
    ...intentFields,
  };
}

export function extractFinanceIntent(rawRequest, principal) {
  const request = String(rawRequest || '').toLowerCase();
  const rateMatch = request.match(/(?:at|rate(?:\s+of)?|interest(?:\s+rate)?(?:\s+of)?)\s*(\d+(?:\.\d+)?)\s*%/i);
  const tenureMatch = request.match(/(?:for|over)\s*(\d+(?:\.\d+)?)\s*(years?|yrs?|months?|mos?)/i);
  if (!rateMatch || !tenureMatch) return null;
  const rate = Number(rateMatch[1]);
  const value = Number(tenureMatch[1]);
  const unit = tenureMatch[2].toLowerCase();
  const tenureMonths = unit.startsWith('year') || unit.startsWith('yr') ? Math.round(value * 12) : Math.round(value);
  if (!Number.isFinite(rate) || !Number.isFinite(tenureMonths) || rate < 0 || rate > 100 || tenureMonths < 1 || tenureMonths > 480) return null;
  return { principal: Math.max(1, Math.round(Number(principal) || 0)), annual_rate: rate, tenure_months: tenureMonths };
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
