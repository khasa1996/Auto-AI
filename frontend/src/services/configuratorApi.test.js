import { gateAssetResponse } from './configuratorApi';

describe('gateAssetResponse', () => {
  it('keeps a verified published asset available', () => {
    const response = { available: true, asset: { asset_id: 'asset-1' } };
    expect(gateAssetResponse(response, { ready: true, blockers: [] })).toEqual(response);
  });

  it('hides an asset when production readiness has blockers', () => {
    expect(gateAssetResponse(
      { available: true, asset: { asset_id: 'asset-1' }, status: 'AVAILABLE' },
      { ready: false, blockers: ['3D asset is not published'] },
    )).toEqual({
      available: false,
      asset: null,
      status: 'COMING_SOON',
      readiness_blockers: ['3D asset is not published'],
    });
  });

  it('fails closed when readiness cannot be verified', () => {
    expect(gateAssetResponse(
      { available: true, asset: { asset_id: 'asset-1' }, status: 'AVAILABLE' },
      null,
    )).toEqual({
      available: false,
      asset: null,
      status: 'COMING_SOON',
      readiness_blockers: ['production readiness could not be verified'],
    });
  });
});
