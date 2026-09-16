import { getConfiguratorRenderProfile } from './configuratorPerformance';

describe('getConfiguratorRenderProfile', () => {
  test('clamps high-density displays to a bounded DPR', () => {
    expect(getConfiguratorRenderProfile({ devicePixelRatio: 3, reducedMotion: false })).toEqual({
      dpr: [1, 1.5],
      contactShadows: true,
    });
  });

  test('uses a lighter profile for reduced-motion preferences', () => {
    expect(getConfiguratorRenderProfile({ devicePixelRatio: 2, reducedMotion: true })).toEqual({
      dpr: [1, 1.25],
      contactShadows: false,
    });
  });

  test('handles missing browser signals safely', () => {
    expect(getConfiguratorRenderProfile({})).toEqual({
      dpr: [1, 1.5],
      contactShadows: true,
    });
  });
});
