export function getSupportedPremiumFeatures(asset) {
  const interactions = Array.isArray(asset?.supportedInteractions) ? asset.supportedInteractions : [];
  return {
    cinematic: true,
    screenshot: true,
    hotspots: Array.isArray(asset?.hotspots) && asset.hotspots.length > 0,
    doors: interactions.includes('doors'),
    hood: interactions.includes('hood'),
    boot: interactions.includes('boot'),
    sunroof: interactions.includes('sunroof'),
  };
}

export function normalizeHotspots(hotspots) {
  if (!Array.isArray(hotspots)) return [];
  return hotspots.filter((item) => item && Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y)) && item.label).map((item) => ({
    id: String(item.id || item.label),
    label: String(item.label),
    description: item.description ? String(item.description) : '',
    x: Math.max(0, Math.min(100, Number(item.x))),
    y: Math.max(0, Math.min(100, Number(item.y))),
  }));
}
