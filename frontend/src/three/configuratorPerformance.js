const DEFAULT_DPR = [1, 1.5];
const REDUCED_MOTION_DPR = [1, 1.25];

export function getConfiguratorRenderProfile({ devicePixelRatio, reducedMotion = false } = {}) {
  if (reducedMotion) {
    return {
      dpr: REDUCED_MOTION_DPR,
      contactShadows: false,
    };
  }

  if (devicePixelRatio === undefined) {
    return {
      dpr: DEFAULT_DPR,
      contactShadows: true,
    };
  }

  const normalizedDpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;

  return {
    dpr: normalizedDpr > 1.5 ? DEFAULT_DPR : [1, normalizedDpr],
    contactShadows: true,
  };
}
