import * as QRCode from 'qrcode';

const QR_OPTIONS = {
  errorCorrectionLevel: 'M',
  margin: 1,
  width: 180,
};

export async function buildConfiguratorShareQr(shareUrl) {
  if (!shareUrl || typeof shareUrl !== 'string' || !shareUrl.trim()) {
    throw new Error('Configurator share URL is unavailable');
  }
  return QRCode.toDataURL(shareUrl, QR_OPTIONS);
}
