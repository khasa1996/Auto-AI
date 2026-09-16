import { buildConfiguratorShareQr } from './qrShare';

test('generates a local QR data URL from the canonical share URL', async () => {
  const url = 'https://autoaiindia.com/configurator/variant-1?config=opaque-token';
  const result = await buildConfiguratorShareQr(url);

  expect(result).toMatch(/^data:image\/png;base64,/);
});

test('fails closed when the share URL is missing', async () => {
  await expect(buildConfiguratorShareQr('')).rejects.toThrow('Configurator share URL is unavailable');
});
