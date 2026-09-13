import { buildConfiguredLeadPayload, compareConfigurations, createShareCardModel } from './configuratorPremium';

test('premium contract helpers remain pure and deterministic', () => {
  const purchasable = { paintId: 'p1', wheelId: 'w1', interiorId: 'i1', roofId: 'r1', accessoryIds: ['a1'] };
  const payload = buildConfiguredLeadPayload({ variantId: 'v1', purchasable, city: 'Sonipat', price: { estimated_on_road: 100 } });
  expect(payload.configuration.paint_id).toBe('p1');
  expect(compareConfigurations(purchasable, { ...purchasable })).toEqual([]);
  expect(createShareCardModel({ variant: { model: 'Test' }, purchasable, price: { estimated_on_road: 100 }, city: 'Sonipat' }).title).toBe('Test');
});
