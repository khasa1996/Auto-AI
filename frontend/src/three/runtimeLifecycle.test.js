import { collectOwnedMaterialResources } from './runtimeLifecycle';

test('returns only owned cloned materials', () => {
  const shared = { userData: { runtimeOwnedMaterial: false } };
  const owned = { userData: { runtimeOwnedMaterial: true } };
  expect(collectOwnedMaterialResources([
    { isMesh: true, material: shared },
    { isMesh: true, material: owned },
    { isMesh: true, material: [owned, shared] },
  ])).toEqual([owned]);
});
