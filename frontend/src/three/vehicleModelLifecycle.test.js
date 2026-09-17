import { disposeOwnedVehicleMaterials } from './vehicleModelLifecycle';

function createScene(materials) {
  return {
    traverse(visitor) {
      materials.forEach((material) => visitor({ isMesh: true, material }));
    },
  };
}

test('disposes each owned material exactly once', () => {
  const disposeFirst = jest.fn();
  const disposeSecond = jest.fn();
  const first = { dispose: disposeFirst };
  const second = { dispose: disposeSecond };
  const scene = createScene([first, second, first]);

  disposeOwnedVehicleMaterials(scene);

  expect(disposeFirst).toHaveBeenCalledTimes(1);
  expect(disposeSecond).toHaveBeenCalledTimes(1);
});

test('disposes material arrays and ignores missing materials', () => {
  const disposeFirst = jest.fn();
  const disposeSecond = jest.fn();
  const scene = {
    traverse(visitor) {
      visitor({ isMesh: true, material: [{ dispose: disposeFirst }, { dispose: disposeSecond }] });
      visitor({ isMesh: true, material: null });
      visitor({ isMesh: false, material: { dispose: jest.fn() } });
    },
  };

  disposeOwnedVehicleMaterials(scene);

  expect(disposeFirst).toHaveBeenCalledTimes(1);
  expect(disposeSecond).toHaveBeenCalledTimes(1);
});

test('does not dispose shared geometry or texture resources', () => {
  const geometryDispose = jest.fn();
  const textureDispose = jest.fn();
  const materialDispose = jest.fn();
  const scene = {
    traverse(visitor) {
      visitor({
        isMesh: true,
        geometry: { dispose: geometryDispose },
        material: { dispose: materialDispose, map: { dispose: textureDispose } },
      });
    },
  };

  disposeOwnedVehicleMaterials(scene);

  expect(materialDispose).toHaveBeenCalledTimes(1);
  expect(geometryDispose).not.toHaveBeenCalled();
  expect(textureDispose).not.toHaveBeenCalled();
});
