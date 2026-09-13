export const FUTURE_CONFIGURATOR_CAPABILITIES = Object.freeze({
  webAR: false,
  mobileAR: false,
  configuredVideo: false,
  liveOEMInventory: false,
});

export function buildConfiguredLeadPayload({ variantId, purchasable, city, price, source = 'configurator' }) {
  return {
    source,
    variant_id: variantId,
    configuration: {
      paint_id: purchasable?.paintId || null,
      wheel_id: purchasable?.wheelId || null,
      interior_id: purchasable?.interiorId || null,
      roof_id: purchasable?.roofId || null,
      accessory_ids: [...(purchasable?.accessoryIds || [])],
    },
    city: city || null,
    estimated_on_road: price?.estimated_on_road || null,
    price_effective_date: price?.effective_date || null,
  };
}

export function compareConfigurations(left, right) {
  const keys = ['paintId', 'wheelId', 'interiorId', 'roofId'];
  return keys.reduce((diff, key) => {
    if ((left?.[key] || null) !== (right?.[key] || null)) diff.push(key);
    return diff;
  }, []).concat(
    JSON.stringify([...(left?.accessoryIds || [])].sort()) === JSON.stringify([...(right?.accessoryIds || [])].sort()) ? [] : ['accessoryIds'],
  );
}

export function createShareCardModel({ variant, purchasable, price, city }) {
  return {
    title: [variant?.brand, variant?.model, variant?.variant].filter(Boolean).join(' '),
    city: city || null,
    estimatedOnRoad: price?.estimated_on_road || null,
    priceIsEstimate: price?.price_is_estimate !== false,
    optionIds: {
      paint: purchasable?.paintId || null,
      wheels: purchasable?.wheelId || null,
      interior: purchasable?.interiorId || null,
      roof: purchasable?.roofId || null,
      accessories: [...(purchasable?.accessoryIds || [])],
    },
  };
}
