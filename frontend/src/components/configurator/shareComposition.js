import { buildConfiguratorShareCard } from './shareCard';
import { buildConfiguratorShareQr } from './qrShare';

export async function buildConfiguratorSharePackage(request) {
  if (!request?.shareUrl) throw new Error('Configurator share URL is unavailable');
  const [blob, qrDataUrl] = await Promise.all([
    buildConfiguratorShareCard(request),
    buildConfiguratorShareQr(request.shareUrl),
  ]);
  return { blob, qrDataUrl, shareUrl: request.shareUrl };
}
