/** Build a privacy-safe canonical configurator share URL. */
export function buildConfiguratorShareUrl({ origin, pathname, shareToken }) {
  if (!shareToken || typeof shareToken !== 'string' || !shareToken.trim()) {
    throw new Error('Configurator share token is unavailable');
  }
  const baseOrigin = String(origin || '').replace(/\/$/, '');
  const basePath = pathname || '/configurator';
  if (!baseOrigin) throw new Error('Configurator share origin is unavailable');
  return `${baseOrigin}${basePath}?config=${encodeURIComponent(shareToken)}`;
}
