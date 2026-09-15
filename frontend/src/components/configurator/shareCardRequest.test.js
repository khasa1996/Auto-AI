import { buildShareCardRequest } from './shareCardRequest';

test('share-card request preserves the object contract used by the viewer', () => {
  const request = buildShareCardRequest({
    sourceCanvas: { width: 1200, height: 700 },
    variant: 'Premium',
    color: 'Pearl White',
    wheels: '18 inch alloy',
    interior: 'Black',
    roof: 'Panoramic',
    price: '₹24,50,000',
    city: 'Sonipat',
  });

  expect(request).toEqual({
    sourceCanvas: { width: 1200, height: 700 },
    vehicleName: undefined,
    variantName: 'Premium',
    color: 'Pearl White',
    wheels: '18 inch alloy',
    interior: 'Black',
    roof: 'Panoramic',
    price: '₹24,50,000',
    city: 'Sonipat',
  });
});
