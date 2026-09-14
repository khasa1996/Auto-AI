import { buildVehicleRuntimeState, buildRuntimeNodeIndex, resolveRuntimeMeshNodes } from './vehicleRuntime';

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

test('indexes scene nodes once and resolves only manifest-declared mesh selections', () => {
  const body = { name: 'Body', isMesh: true };
  const sportWheel = { name: 'WheelSport', isMesh: true };
  const blackRoof = { name: 'RoofBlack', isMesh: true };
  const undeclared = { name: 'SecretNode', isMesh: true };
  const traversed = [];
  const scene = {
    traverse(callback) {
      [body, sportWheel, blackRoof, undeclared].forEach((node) => {
        traversed.push(node.name);
        callback(node);
      });
    },
  };

  const index = buildRuntimeNodeIndex(scene);

  expect(traversed).toHaveLength(4);
  expect(resolveRuntimeMeshNodes(index, { sport: 'WheelSport' }, 'sport')).toEqual([sportWheel]);
  expect(resolveRuntimeMeshNodes(index, { sport: 'WheelSport' }, 'unknown')).toEqual([]);
  expect(resolveRuntimeMeshNodes(index, { roof_black: ['RoofBlack'] }, 'roof_black')).toEqual([blackRoof]);
  expect(resolveRuntimeMeshNodes(index, { secret: ['SecretNode'] }, 'secret')).toEqual([undeclared]);
});
