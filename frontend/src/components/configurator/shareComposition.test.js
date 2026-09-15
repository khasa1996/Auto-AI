jest.mock('./shareCard', () => ({
  buildConfiguratorShareCard: jest.fn(async () => new Blob(['share-card'], { type: 'image/png' })),
}));
jest.mock('./qrShare', () => ({
  buildConfiguratorShareQr: jest.fn(async (url) => `data:image/png;base64,${btoa(url)}`),
}));

import { buildConfiguratorSharePackage, composeShareCardWithQr } from './shareComposition';
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

test('composes the QR image onto the branded card', async () => {
  const originalImage = global.Image;
  const originalCreateElement = document.createElement;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const drawImage = jest.fn();
  const fillRect = jest.fn();
  const fillText = jest.fn();
  const context = { drawImage, fillRect, fillText, fillStyle: '', font: '', textAlign: '' };
  const canvas = { width: 0, height: 0, getContext: () => context, toBlob: (cb) => cb(new Blob(['composed'], { type: 'image/png' })) };

  global.Image = class MockImage {
    set src(value) { this._src = value; Promise.resolve().then(() => this.onload?.()); }
  };
  URL.createObjectURL = jest.fn(() => 'blob:share-card');
  URL.revokeObjectURL = jest.fn();
  document.createElement = jest.fn((tag) => tag === 'canvas' ? canvas : originalCreateElement.call(document, tag));

  try {
    const result = await composeShareCardWithQr(new Blob(['card'], { type: 'image/png' }), 'data:image/png;base64,qr');
    expect(result).toBeInstanceOf(Blob);
    expect(drawImage).toHaveBeenCalledTimes(2);
    expect(fillRect).toHaveBeenCalledWith(1010, 608, 150, 140);
    expect(fillText).toHaveBeenCalledWith('SCAN TO VIEW', 1085, 756);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:share-card');
  } finally {
    global.Image = originalImage;
    document.createElement = originalCreateElement;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  }
});
