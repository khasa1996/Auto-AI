import { buildConfiguratorShareUrl } from './shareLink';

describe('buildConfiguratorShareUrl', () => {
  test('builds canonical URL from opaque share token without exposing configuration data', () => {
    expect(buildConfiguratorShareUrl({
      origin: 'https://autoaiindia.com/',
      pathname: '/configurator/variant-1',
      shareToken: 'opaque-token-123',
    })).toBe('https://autoaiindia.com/configurator/variant-1?config=opaque-token-123');
  });

  test('encodes the share token as a URL query value', () => {
    expect(buildConfiguratorShareUrl({
      origin: 'https://autoaiindia.com',
      pathname: '/configurator/variant-1',
      shareToken: 'token with spaces',
    })).toContain('?config=token%20with%20spaces');
  });

  test('fails closed when a share token is missing', () => {
    expect(() => buildConfiguratorShareUrl({
      origin: 'https://autoaiindia.com',
      pathname: '/configurator/variant-1',
      shareToken: '',
    })).toThrow('Configurator share token is unavailable');
  });
});
