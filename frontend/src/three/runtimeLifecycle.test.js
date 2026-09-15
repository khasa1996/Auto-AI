import {
  collectOwnedMaterialResources,
  disposeOwnedMaterialResources,
  markRuntimeOwnedMaterials,
} from './runtimeLifecycle';

function createMesh(material) {
  return { isMesh: true, material };
}

describe('runtime lifecycle material ownership', () => {
  test('marks cloned materials as runtime-owned and ignores non-mesh nodes', () => {
    const ownedMaterial = { userData: {} };
    const meshes = [createMesh(ownedMaterial), { isMesh: false, material: { userData: {} } }];

    markRuntimeOwnedMaterials(meshes);

    expect(ownedMaterial.userData.runtimeOwnedMaterial).toBe(true);
  });

  test('collects only owned materials and deduplicates shared material references', () => {
    const ownedMaterial = { userData: { runtimeOwnedMaterial: true } };
    const sourceMaterial = { userData: {} };
    const meshes = [
      createMesh(ownedMaterial),
      createMesh([ownedMaterial, sourceMaterial]),
    ];

    expect(collectOwnedMaterialResources(meshes)).toEqual([ownedMaterial]);
  });

  test('disposes each owned material exactly once', () => {
    const first = { dispose: jest.fn() };
    const second = { dispose: jest.fn() };

    disposeOwnedMaterialResources([first, first, second]);

    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(second.dispose).toHaveBeenCalledTimes(1);
  });

  test('does not dispose shared source materials when they are not owned', () => {
    const sourceMaterial = { dispose: jest.fn(), userData: {} };

    const owned = collectOwnedMaterialResources([createMesh(sourceMaterial)]);
    disposeOwnedMaterialResources(owned);

    expect(owned).toEqual([]);
    expect(sourceMaterial.dispose).not.toHaveBeenCalled();
  });
});
