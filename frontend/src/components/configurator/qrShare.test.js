import { buildConfiguratorShareQr } from './qrShare';

const QRCode = require('qrcode');

test('generates a local QR data URL from the canonical share URL', async () => {
  const url = 'https://autoaiindia.com/configurator/variant-1?config=opaque-token';
  const result = await buildConfiguratorShareQr(url);

  expect(typeof result).toBe('string');
  expect(result).toMatch(/^data:image\/png;base64,/);
});

test('fails closed when the share URL is missing', async () => {
  await expect(buildConfiguratorShareQr('')).rejects.toThrow('Configurator share URL is unavailable');
});

test('uses the expected QR configuration', async () => {
  const spy = jest.spyOn(QRCode, 'toDataURL');
  const url = 'https://autoaiindia.com/configurator/variant-1?config=opaque-token';

  await buildConfiguratorShareQr(url);

  expect(spy).toHaveBeenCalledWith(url, expect.objectContaining({
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 180,
  }));

  spy.mockRestore();
});
