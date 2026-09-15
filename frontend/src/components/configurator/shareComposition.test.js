jest.mock('./shareCard', () => ({
  buildConfiguratorShareCard: jest.fn(async () => new Blob(['share-card'], { type: 'image/png' })),
}));
jest.mock('./qrShare', () => ({
  buildConfiguratorShareQr: jest.fn(async (url) => `data:image/png;base64,${btoa(url)}`),
}));

import { buildConfiguratorSharePackage } from './shareComposition';
import { buildConfiguratorShareQr } from './qrShare';
import { buildConfiguratorShareCard } from './shareCard';

test('builds a share package from the branded card and opaque share URL', async () => {
  const result = await buildConfiguratorSharePackage({
    sourceCanvas: { width: 1200, height: 700 },
    shareUrl: 'https://autoaiindia.com/configurator/variant-1?config=opaque-token',
    vehicleName: 'Example Motors',
    variantName: 'Premium',
    color: 'Pearl White',
    wheels: '18 inch alloy',
    interior: 'Black',
    roof: 'Panoramic',
    price: '₹24,50,000',
    city: 'Sonipat',
  });

  expect(buildConfiguratorShareCard).toHaveBeenCalled();
  expect(buildConfiguratorShareQr).toHaveBeenCalledWith('https://autoaiindia.com/configurator/variant-1?config=opaque-token');
  expect(result).toHaveProperty('blob');
  expect(result).toHaveProperty('shareUrl', 'https://autoaiindia.com/configurator/variant-1?config=opaque-token');
  expect(result).toHaveProperty('qrDataUrl');
});

test('fails closed when no share URL is available', async () => {
  await expect(buildConfiguratorSharePackage({
    sourceCanvas: { width: 1200, height: 700 },
    shareUrl: '',
  })).rejects.toThrow('Configurator share URL is unavailable');
});
