import { describe, expect, it } from 'vitest';
import { normalize3DAsset } from './threeDAsset';

describe('normalize3DAsset', () => {
  it('returns a disabled asset when no 3D model URL exists', () => {
    expect(normalize3DAsset({})).toEqual({
      enabled: false,
      modelUrl: null,
      version: null,
      paintMaterials: [],
      wheelOptions: [],
      interiorOptions: [],
      supportedInteractions: [],
    });
  });

  it('normalizes a configured 3D asset without accepting ordinary images', () => {
    expect(normalize3DAsset({ model3dUrl: 'https://cdn.example.com/car.glb' })).toMatchObject({
      enabled: true,
      modelUrl: 'https://cdn.example.com/car.glb',
    });
  });
});
