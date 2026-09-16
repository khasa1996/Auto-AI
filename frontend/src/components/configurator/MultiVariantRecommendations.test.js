import { buildRecommendationCards, getRecommendationCta } from './MultiVariantRecommendations';

test('builds bounded recommendation cards from backend-authoritative results', () => {
  const response = {
    recommendations: [
      {
        variant_id: 'variant-1',
        rank: 1,
        fit_score: 91.5,
        requirement_fit: 'match',
        budget_fit: 'within_budget',
        fuel_fit: 'match',
        availability_status: 'AVAILABLE',
        configurator_available: true,
        vehicle: { name: 'Example SUV', display_name: 'Example SUV' },
        pricing: { base_ex_showroom: 1800000 },
        why_it_fits: 'Example SUV matches the requested segment and fits the stated budget.',
        tradeoff: null,
      },
    ],
    explanation: 'Backend-ranked recommendations.',
  };

  const cards = buildRecommendationCards(response, 3);

  expect(cards).toHaveLength(1);
  expect(cards[0]).toEqual(expect.objectContaining({
    variantId: 'variant-1',
    name: 'Example SUV',
    fitScore: 91.5,
    configuratorAvailable: true,
    price: 1800000,
  }));
});

test('fails closed for malformed or over-limit recommendation responses', () => {
  expect(buildRecommendationCards({ recommendations: 'invalid' }, 3)).toEqual([]);
  expect(buildRecommendationCards({ recommendations: [
    { variant_id: '1', rank: 1, fit_score: 10, vehicle: { name: 'A' } },
    { variant_id: '2', rank: 2, fit_score: 20, vehicle: { name: 'B' } },
    { variant_id: '3', rank: 3, fit_score: 30, vehicle: { name: 'C' } },
    { variant_id: '4', rank: 4, fit_score: 40, vehicle: { name: 'D' } },
  ] }, 3)).toHaveLength(3);
});

test('uses a readiness-safe CTA when the 3D configurator is unavailable', () => {
  expect(getRecommendationCta({ variantId: 'variant-2', configuratorAvailable: false })).toEqual({
    label: '3D coming soon',
    href: null,
    disabled: true,
  });
  expect(getRecommendationCta({ variantId: 'variant-1', configuratorAvailable: true })).toEqual({
    label: 'Open configurator',
    href: '/configurator/variant-1',
    disabled: false,
  });
});