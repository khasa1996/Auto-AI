import {
  FUTURE_CONFIGURATOR_CAPABILITIES,
  buildConfiguredLeadPayload,
  compareConfigurations,
  createShareCardModel,
} from './configuratorPremium';

test('keeps unsupported future capabilities disabled', () => {
  expect(FUTURE_CONFIGURATOR_CAPABILITIES).toEqual({
    webAR: false,
    mobileAR: false,
    configuredVideo: false,
    liveOEMInventory: false,
  });
});

test('builds a backend-safe configured lead payload', () => {
  expect(buildConfiguredLeadPayload({
    variantId: 'v1',
    purchasable: { paintId: 'p1', wheelId: 'w1', interiorId: 'i1', roofId: null, accessoryIds: ['a2'] },
    city: 'Sonipat',
    price: { estimated_on_road: 1200000, effective_date: '2026-09-11' },
  })).toMatchObject({
    source: 'configurator',
    variant_id: 'v1',
    city: 'Sonipat',
    estimated_on_road: 1200000,
  });
});

test('compares only purchasable state and treats accessory order as irrelevant', () => {
  expect(compareConfigurations(
    { paintId: 'p1', wheelId: 'w1', interiorId: 'i1', roofId: 'r1', accessoryIds: ['a1', 'a2'] },
    { paintId: 'p1', wheelId: 'w2', interiorId: 'i1', roofId: 'r1', accessoryIds: ['a2', 'a1'] },
  )).toEqual(['wheelId']);
});

test('creates a share-card model without exposing private ownership data', () => {
  const card = createShareCardModel({
    variant: { brand: 'Brand', model: 'Model', variant: 'Trim' },
    purchasable: { paintId: 'p1', wheelId: 'w1', interiorId: 'i1', roofId: 'r1', accessoryIds: [] },
    price: { estimated_on_road: 1000000, price_is_estimate: true },
    city: 'Sonipat',
  });
  expect(card).toEqual(expect.objectContaining({ title: 'Brand Model Trim', city: 'Sonipat', estimatedOnRoad: 1000000 }));
  expect(card.owner_phone).toBeUndefined();
});
