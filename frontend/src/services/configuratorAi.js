export function buildConfiguratorAIIntent(variantId, rawRequest, fields = {}) {
  return {
    variant_id: variantId,
    raw_request: String(rawRequest || '').slice(0, 2000),
    ...fields,
  };
}

export function getAIConfigurationSelection(response) {
  const payload = response?.data || response;
  if (!payload?.valid || !payload?.configuration) return null;
  return {
    purchasable: payload.configuration.purchasable,
    interaction: payload.configuration.interaction,
  };
}
