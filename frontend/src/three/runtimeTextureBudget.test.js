import { inspectTextureBudget } from './runtimeTextureBudget';

test('deduplicates textures and flags models above the runtime budget', () => {
  const shared = { uuid: 'shared', image: { width: 4096, height: 4096 } };
  const second = { uuid: 'second', image: { width: 4096, height: 4096 } };

  expect(inspectTextureBudget([
    { isMesh: true, material: { map: shared } },
    { isMesh: true, material: { normalMap: shared, roughnessMap: second } },
  ], 256 * 1024 * 1024)).toEqual({
    estimatedBytes: 178956970,
    textureCount: 2,
    overBudget: false,
  });
});

test('flags a single oversized texture set', () => {
  const texture = { uuid: 'large', image: { width: 16384, height: 16384 } };

  expect(inspectTextureBudget([
    { isMesh: true, material: { map: texture } },
  ], 256 * 1024 * 1024)).toEqual({
    estimatedBytes: 1431655765,
    textureCount: 1,
    overBudget: true,
  });
});
