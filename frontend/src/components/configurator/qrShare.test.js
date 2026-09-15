jest.mock('qrcode', () => ({
  toDataURL: jest.fn(async (value, options) => `data:image/png;base64,${btoa(`${value}:${options.width}`)}`),
}));

import { buildConfiguratorShareQr } from './qrShare';

const getQrMock = () => require('qrcode').toDataURL;

test('generates a local QR data URL from the canonical share URL', async () => {
  const url = 'https://autoaiindia.com/configurator/variant-1?config=opaque-token';
  const qrMock = getQrMock();
  const result = await buildConfiguratorShareQr(url);

  expect(result).toMatch(/^data:image\/png;base64,/);
  expect(qrMock).toHaveBeenCalledWith(url, expect.objectContaining({
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 180,
  }));
});

test('fails closed when the share URL is missing', async () => {
  const qrMock = getQrMock();
  qrMock.mockClear();

  await expect(buildConfiguratorShareQr('')).rejects.toThrow('Configurator share URL is unavailable');
  expect(qrMock).not.toHaveBeenCalled();
});
