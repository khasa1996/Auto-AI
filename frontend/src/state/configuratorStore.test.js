import { isCameraPresetSupported, useConfiguratorStore } from './configuratorStore';

test('maps exterior presets to the verified exterior camera capability', () => {
  expect(isCameraPresetSupported(['camera_exterior'], 'front')).toBe(true);
  expect(isCameraPresetSupported(['camera_exterior'], 'top')).toBe(true);
  expect(isCameraPresetSupported(['camera_interior'], 'front')).toBe(false);
});

test('requires both exterior camera and boot capability for the boot view', () => {
  expect(isCameraPresetSupported(['camera_exterior', 'boot'], 'boot')).toBe(true);
  expect(isCameraPresetSupported(['camera_exterior'], 'boot')).toBe(false);
});

test('maps interior presets to the verified interior camera capability', () => {
  expect(isCameraPresetSupported(['camera_interior'], 'interior')).toBe(true);
  expect(isCameraPresetSupported(['camera_interior'], 'cockpit')).toBe(true);
  expect(isCameraPresetSupported(['camera_exterior'], 'cockpit')).toBe(false);
});

test('rejects unknown or malformed camera capabilities', () => {
  expect(isCameraPresetSupported([], 'exterior')).toBe(false);
  expect(isCameraPresetSupported(null, 'exterior')).toBe(false);
  expect(isCameraPresetSupported(['camera_exterior'], 'unknown')).toBe(false);
});

describe('configuratorStore asset boundary', () => {
  beforeEach(() => {
    useConfiguratorStore.getState().reset();
  });

  test('normalizes the backend runtime manifest fields before storing them', () => {
    useConfiguratorStore.getState().setAsset({
      available: true,
      url: 'https://cdn.example.com/model.glb',
      version: 'v1',
      format: 'glb',
      supported_interactions: ['camera_exterior', 'doors'],
      paint_material_names: ['BodyPaint'],
      interior_material_names: ['Leather'],
      interior_material_mappings: { black: ['Leather'] },
      wheel_mesh_names: { sport: 'WheelSport' },
      option_mesh_names: { roof_black: ['RoofBlack'] },
      camera_preset_names: ['exterior', 'interior'],
      interaction_animation_names: { doors: { open: 'Door_Open' } },
    });

    const asset = useConfiguratorStore.getState().asset;

    expect(asset.supportedInteractions).toEqual(['camera_exterior', 'doors']);
    expect(asset.paintMaterialNames).toEqual(['BodyPaint']);
    expect(asset.interiorMaterialNames).toEqual(['Leather']);
    expect(asset.interiorMaterialMappings).toEqual({ black: ['Leather'] });
    expect(asset.wheelMeshNames).toEqual({ sport: 'WheelSport' });
    expect(asset.optionMeshNames).toEqual({ roof_black: ['RoofBlack'] });
    expect(asset.cameraPresetNames).toEqual(['exterior', 'interior']);
    expect(asset.interactionAnimationNames).toEqual({ doors: { open: 'Door_Open' } });
    expect(asset.available).toBe(true);
  });
});
