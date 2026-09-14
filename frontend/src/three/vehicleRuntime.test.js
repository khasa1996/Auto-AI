import { buildVehicleRuntimeState, buildRuntimeNodeIndex, resolveRuntimeAsset, resolveRuntimeMeshNodes } from './vehicleRuntime';

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

test('uses the verified manifest as the runtime asset contract', () => {
  const asset = resolveRuntimeAsset({
    available: true,
    url: 'https://cdn.example.com/demo-car.glb?token=abc',
    version: '2026-09-14',
    supportedInteractions: ['doors', 'bogus'],
    cameraPresetNames: ['exterior', 'bogus'],
    paintMaterialNames: ['BodyPaint'],
    wheelMeshNames: { sport: 'WheelSport' },
    optionMeshNames: { roof_black: ['RoofBlack'] },
    interactionAnimationNames: {
      doors: { front_left_open: 'DoorFL_Open', rear_left_open: 'MissingClip' },
    },
  });

  expect(asset).toMatchObject({
    url: 'https://cdn.example.com/demo-car.glb?token=abc',
    version: '2026-09-14',
    supportedInteractions: ['doors'],
    cameraPresetNames: ['exterior'],
    paintMaterialNames: ['BodyPaint'],
    wheelMeshNames: { sport: 'WheelSport' },
    optionMeshNames: { roof_black: ['RoofBlack'] },
  });
  expect(asset.interactionAnimationNames).toEqual({
    doors: { front_left_open: 'DoorFL_Open' },
  });
});

test('rejects a runtime asset without a verified URL and version', () => {
  expect(resolveRuntimeAsset({ available: true, url: 'https://cdn.example.com/car.png', version: '1' })).toBeNull();
  expect(resolveRuntimeAsset({ available: true, url: 'https://cdn.example.com/car.glb', version: '' })).toBeNull();
});
