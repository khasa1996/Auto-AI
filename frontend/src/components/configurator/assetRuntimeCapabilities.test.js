import {
  getVerifiedRuntimeCapabilities,
  isRuntimeAssetUsable,
  filterCameraPresets,
  getVerifiedMappings,
} from './assetRuntimeCapabilities';

test('rejects runtime use when the asset is unavailable or missing a versioned GLB/GLTF URL', () => {
  expect(isRuntimeAssetUsable({ available: false, url: 'https://cdn.example.com/car.glb', version: 'v1' })).toBe(false);
  expect(isRuntimeAssetUsable({ available: true, url: 'https://cdn.example.com/car.png', version: 'v1' })).toBe(false);
  expect(isRuntimeAssetUsable({ available: true, url: 'https://cdn.example.com/car.glb', version: null })).toBe(false);
  expect(isRuntimeAssetUsable({ available: true, url: 'https://cdn.example.com/car.glb', version: 'v1' })).toBe(true);
});

test('accepts signed or cache-busted GLB/GLTF URLs when the pathname is a valid 3D asset', () => {
  expect(isRuntimeAssetUsable({ available: true, url: 'https://cdn.example.com/car.glb?token=abc123', version: 'v1' })).toBe(true);
  expect(isRuntimeAssetUsable({ available: true, url: 'https://cdn.example.com/car.gltf#revision=v2', version: 'v2' })).toBe(true);
});

test('exposes only capabilities declared by the verified asset manifest', () => {
  expect(getVerifiedRuntimeCapabilities({
    supportedInteractions: ['camera_exterior', 'doors', 'bogus'],
    paintMaterialNames: ['BodyPaint'],
    interiorMaterialNames: ['SeatLeather'],
    wheelMeshNames: { sport: 'WheelSport' },
    optionMeshNames: { roof_black: ['RoofBlack'] },
    cameraPresetNames: ['exterior', 'interior'],
  })).toEqual({
    supportedInteractions: ['camera_exterior', 'doors'],
    paintMaterialNames: ['BodyPaint'],
    interiorMaterialNames: ['SeatLeather'],
    wheelMeshNames: { sport: 'WheelSport' },
    optionMeshNames: { roof_black: ['RoofBlack'] },
    cameraPresetNames: ['exterior', 'interior'],
  });
});

test('filters camera presets to names declared by the verified manifest', () => {
  expect(filterCameraPresets(['exterior', 'interior', 'rear'], ['exterior', 'rear'])).toEqual(['exterior', 'rear']);
  expect(filterCameraPresets(['exterior', 'interior'], ['interior'])).toEqual(['interior']);
});

test('does not expose undeclared material or mesh mappings to the viewer', () => {
  expect(getVerifiedMappings({
    paintMaterialNames: ['BodyPaint'],
    interiorMaterialNames: ['Leather'],
    wheelMeshNames: { sport: 'WheelSport', fake: 'WheelFake' },
    optionMeshNames: { roof_black: ['RoofBlack'], fake: ['FakeMesh'] },
  }, {
    materialNames: ['BodyPaint', 'Leather', 'WheelPaint'],
    meshNames: ['WheelSport', 'RoofBlack'],
  })).toEqual({
    paintMaterialNames: ['BodyPaint'],
    interiorMaterialNames: ['Leather'],
    wheelMeshNames: { sport: 'WheelSport' },
    optionMeshNames: { roof_black: ['RoofBlack'] },
  });
});

test('resolves only camera presets declared by the verified runtime manifest', async () => {
  const { resolveCameraPreset } = await import('../../three/CameraPresets');
  expect(resolveCameraPreset('exterior', ['exterior', 'rear'])).toEqual({
    position: [4.5, 1.6, 5.5],
    target: [0, 0.3, 0],
  });
  expect(resolveCameraPreset('interior', ['exterior', 'rear'])).toBeNull();
});

test('does not treat an empty verified camera declaration as all presets', async () => {
  const { resolveCameraPreset } = await import('../../three/CameraPresets');
  expect(resolveCameraPreset('exterior', [])).toBeNull();
});
