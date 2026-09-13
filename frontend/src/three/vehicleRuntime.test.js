import { buildVehicleRuntimeState, resolveRuntimeMappings } from './vehicleRuntime';

test('builds a runtime state from verified manifest capabilities', () => {
  expect(buildVehicleRuntimeState({
    supportedInteractions: ['doors', 'bogus'],
    cameraPresetNames: ['exterior', 'rear'],
    paintMaterialNames: ['BodyPaint'],
    interiorMaterialNames: ['Leather'],
    wheelMeshNames: { sport: 'WheelSport' },
    optionMeshNames: { roof_black: ['RoofBlack'] },
  })).toEqual({
    supportedInteractions: ['doors'],
    cameraPresetNames: ['exterior', 'rear'],
    paintMaterialNames: ['BodyPaint'],
    interiorMaterialNames: ['Leather'],
    wheelMeshNames: { sport: 'WheelSport' },
    optionMeshNames: { roof_black: ['RoofBlack'] },
  });
});

test('does not activate unsupported interaction animations', () => {
  expect(buildVehicleRuntimeState({
    supportedInteractions: ['doors'],
    interactionAnimationNames: {
      doors: { front_left_open: 'DoorFL_Open' },
      hood: { open: 'Hood_Open' },
    },
  }).interactionAnimationNames).toEqual({
    doors: { front_left_open: 'DoorFL_Open' },
  });
});

test('resolves only material and mesh mappings present in the loaded asset', () => {
  expect(resolveRuntimeMappings({
    paintMaterialNames: ['BodyPaint', 'MissingPaint'],
    interiorMaterialNames: ['Leather', 'MissingLeather'],
    wheelMeshNames: { sport: 'WheelSport', missing: 'MissingWheel' },
    optionMeshNames: { roof_black: ['RoofBlack', 'MissingRoof'] },
  }, {
    materialNames: ['BodyPaint', 'Leather'],
    meshNames: ['WheelSport', 'RoofBlack'],
  })).toEqual({
    paintMaterialNames: ['BodyPaint'],
    interiorMaterialNames: ['Leather'],
    wheelMeshNames: { sport: 'WheelSport' },
    optionMeshNames: { roof_black: ['RoofBlack'] },
  });
});
