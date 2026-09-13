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

test('exposes only capabilities declared by the verified asset manifest', () => {
  expect(getVerifiedRuntimeCapabilities({
    supportedInteractions: ['camera_exterior', 'doors', 'bogus'],
    paintMaterialNames: ['BodyPaint'],
    interiorMaterialNames: ['SeatLeather'],
    wheelMeshNames: { sport: 'WheelSport' },
    optionMeshNames: { roof_black: ['RoofBlack'] },
    cameraPresetNames: ['exterior', 'interior'],
    animationNames: ['door_open'],
  })).toEqual({
    supportedInteractions: ['camera_exterior', 'doors'],
    paintMaterialNames: ['BodyPaint'],
    interiorMaterialNames: ['SeatLeather'],
    wheelMeshNames: { sport: 'WheelSport' },
    optionMeshNames: { roof_black: ['RoofBlack'] },
    cameraPresetNames: ['exterior', 'interior'],
    animationNames: ['door_open'],
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
