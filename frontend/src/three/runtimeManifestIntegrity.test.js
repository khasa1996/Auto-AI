import { resolveRuntimeAsset } from './vehicleRuntime';

test('requires a verified versioned runtime asset before the viewer can load a model', () => {
  expect(resolveRuntimeAsset({
    available: true,
    url: 'https://cdn.example.com/car.glb',
    version: 'v1',
    configuratorStatus: 'READY',
  })).toMatchObject({
    available: true,
    url: 'https://cdn.example.com/car.glb',
    version: 'v1',
  });
});

test('rejects a runtime asset that has a model URL but no verified manifest version', () => {
  expect(resolveRuntimeAsset({
    available: true,
    url: 'https://cdn.example.com/car.glb',
    version: null,
    configuratorStatus: 'READY',
  })).toBeNull();
});

test('rejects demo-shaped runtime props that bypass the manifest contract', () => {
  expect(resolveRuntimeAsset({
    available: true,
    url: 'https://cdn.example.com/car.glb',
    version: 'runtime-props',
  })).toBeNull();
});
