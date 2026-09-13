const DEMO_PRESENTATION = {
  badge: 'DEMO 3D MODEL',
  disclosure: 'Visual representation for configuration demonstration. OEM verification pending.',
  isDemo: true,
};

export function getRuntimeAssetPresentation(asset = {}) {
  const isVerified = asset.provenance === 'OEM_AUTHORIZED'
    && asset.published === true
    && asset.validationPassed === true
    && asset.adminReviewed === true;

  if (isVerified) {
    return {
      badge: 'OEM-VERIFIED',
      disclosure: 'OEM-authorized 3D model.',
      isDemo: false,
    };
  }

  return { ...DEMO_PRESENTATION };
}
