import { getSupportedPremiumFeatures, normalizeHotspots } from './premiumShowroom';

test('premium features remain asset-gated', () => {
  expect(getSupportedPremiumFeatures({ supportedInteractions: ['doors'] })).toMatchObject({
    cinematic: true,
    screenshot: true,
    hotspots: false,
    doors: true,
    hood: false,
  });
});

test('hotspots normalize safe viewport coordinates', () => {
  expect(normalizeHotspots([
    { id: 'h1', label: 'LED Headlamps', x: 120, y: -10 },
    { id: 'bad', x: 20, y: 20 },
    null,
  ])).toEqual([
    { id: 'h1', label: 'LED Headlamps', description: '', x: 100, y: 0 },
  ]);
});
