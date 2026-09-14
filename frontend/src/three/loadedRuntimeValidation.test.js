import { validateLoadedRuntimeScene } from './vehicleRuntime';

test('accepts a loaded GLB when declared materials, meshes, and animations exist', () => {
  const scene = {
    traverse(callback) {
      callback({ name: 'BodyPaint', isMesh: true, material: { name: 'BodyPaint' } });
      callback({ name: 'Leather', isMesh: true, material: { name: 'Leather' } });
      callback({ name: 'WheelSport', isMesh: true });
      callback({ name: 'RoofBlack', isMesh: true });
    },
  };

  expect(validateLoadedRuntimeScene({
    paintMaterialNames: ['BodyPaint'],
    interiorMaterialNames: ['Leather'],
    wheelMeshNames: { sport: 'WheelSport' },
    optionMeshNames: { roof_black: ['RoofBlack'] },
    interactionAnimationNames: { doors: { open: 'Door_Open' } },
  }, scene, [{ name: 'Door_Open' }])).toEqual({ valid: true, errors: [] });
});

test('rejects a loaded GLB when a manifest-declared runtime resource is missing', () => {
  const scene = {
    traverse(callback) {
      callback({ name: 'BodyPaint', isMesh: true, material: { name: 'BodyPaint' } });
      callback({ name: 'WheelSport', isMesh: true });
    },
  };

  const result = validateLoadedRuntimeScene({
    paintMaterialNames: ['BodyPaint'],
    interiorMaterialNames: ['Leather'],
    wheelMeshNames: { sport: 'WheelSport' },
    optionMeshNames: { roof_black: ['RoofBlack'] },
    interactionAnimationNames: { doors: { open: 'Door_Open' } },
  }, scene, []);

  expect(result.valid).toBe(false);
  expect(result.errors).toEqual(expect.arrayContaining([
    expect.stringContaining('Leather'),
    expect.stringContaining('RoofBlack'),
    expect.stringContaining('Door_Open'),
  ]));
});

test('does not fail for an asset with no optional runtime mappings', () => {
  expect(validateLoadedRuntimeScene({}, { traverse() {} }, [])).toEqual({ valid: true, errors: [] });
});
