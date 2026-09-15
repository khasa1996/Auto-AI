import { buildConfiguratorShareCard } from './shareCard';
import { buildConfiguratorShareQr } from './qrShare';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load share QR'));
    image.src = src;
  });
}

export async function composeShareCardWithQr(cardBlob, qrDataUrl) {
  if (!cardBlob) throw new Error('Configurator share card is unavailable');
  if (!qrDataUrl) return cardBlob;

  const imageUrl = URL.createObjectURL(cardBlob);
  try {
    const [cardImage, qrImage] = await Promise.all([loadImage(imageUrl), loadImage(qrDataUrl)]);
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 760;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Share composition canvas is unavailable');

    ctx.drawImage(cardImage, 0, 0, 1200, 760);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1010, 608, 150, 140);
    ctx.drawImage(qrImage, 1025, 615, 120, 120);
    ctx.font = '700 9px Arial, sans-serif';
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN TO VIEW', 1085, 756);
    ctx.textAlign = 'left';

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Unable to compose share card'))), 'image/png', 1);
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export async function buildConfiguratorSharePackage(request) {
  if (!request?.shareUrl) throw new Error('Configurator share URL is unavailable');
  const [cardBlob, qrDataUrl] = await Promise.all([
    buildConfiguratorShareCard(request),
    buildConfiguratorShareQr(request.shareUrl),
  ]);
  const blob = await composeShareCardWithQr(cardBlob, qrDataUrl);
  return { blob, qrDataUrl, shareUrl: request.shareUrl };
}
