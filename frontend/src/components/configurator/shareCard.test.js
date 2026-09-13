import { buildShareCardData } from './shareCard';

test('share-card data is privacy-safe and deterministic', () => {
  expect(buildShareCardData({
    vehicleName: 'Example Motors',
    variantName: 'Premium',
    color: 'Pearl White',
    wheels: '18 inch alloy',
    interior: 'Black',
    roof: 'Panoramic',
    price: '₹24,50,000',
    city: 'Sonipat',
    ownerPhone: '+91 9999999999',
    shareToken: 'secret-token',
  })).toEqual({
    vehicleName: 'Example Motors',
    variantName: 'Premium',
    color: 'Pearl White',
    wheels: '18 inch alloy',
    interior: 'Black',
    roof: 'Panoramic',
    price: '₹24,50,000',
    city: 'Sonipat',
  });
});

test('share-card text is bounded for stable rendering', () => {
  const data = buildShareCardData({ vehicleName: 'x'.repeat(200), variantName: 'y'.repeat(200) });
  expect(data.vehicleName).toHaveLength(80);
  expect(data.variantName).toHaveLength(80);
});
