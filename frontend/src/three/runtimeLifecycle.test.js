import {
  collectOwnedMaterialResources,
  collectOwnedRuntimeResources,
  disposeOwnedMaterialResources,
  disposeOwnedRuntimeResources,
  markRuntimeOwnedMaterials,
  markRuntimeOwnedResources,
} from './runtimeLifecycle';

function createMesh(material) {
  return { isMesh: true, material };
}

function createResource() {
  return { dispose: jest.fn(), userData: {} };
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

describe('runtime lifecycle generic resource ownership', () => {
  test('marks and collects explicitly owned material, geometry, and texture resources', () => {
    const material = createResource();
    const geometry = createResource();
    const texture = createResource();
    const source = createResource();

    markRuntimeOwnedResources([material, geometry, texture]);

    expect(collectOwnedRuntimeResources([material, geometry, texture, source])).toEqual([
      material,
      geometry,
      texture,
    ]);
  });

  test('deduplicates duplicate runtime resource references', () => {
    const material = createResource();
    markRuntimeOwnedResources([material, material]);

    expect(collectOwnedRuntimeResources([material, material])).toEqual([material]);
  });

  test('disposes each owned runtime resource exactly once', () => {
    const material = createResource();
    const geometry = createResource();
    const texture = createResource();

    markRuntimeOwnedResources([material, geometry, texture]);
    disposeOwnedRuntimeResources([material, geometry, texture, material]);

    expect(material.dispose).toHaveBeenCalledTimes(1);
    expect(geometry.dispose).toHaveBeenCalledTimes(1);
    expect(texture.dispose).toHaveBeenCalledTimes(1);
  });

  test('does not dispose unowned source resources', () => {
    const sourceGeometry = createResource();
    const sourceTexture = createResource();

    disposeOwnedRuntimeResources([sourceGeometry, sourceTexture]);

    expect(sourceGeometry.dispose).not.toHaveBeenCalled();
    expect(sourceTexture.dispose).not.toHaveBeenCalled();
  });

  test('cleanup is defensive for missing dispose methods and repeated cleanup', () => {
    const resource = { userData: {} };
    markRuntimeOwnedResources([resource]);

    expect(() => disposeOwnedRuntimeResources([resource, resource])).not.toThrow();
  });
});

describe('runtime lifecycle transitions', () => {
  test('releases runtime A before it becomes stale while runtime B remains active', () => {
    const runtimeA = createResource();
    const runtimeB = createResource();
    markRuntimeOwnedResources([runtimeA, runtimeB]);

    disposeOwnedRuntimeResources([runtimeA]);

    expect(runtimeA.dispose).toHaveBeenCalledTimes(1);
    expect(runtimeB.dispose).not.toHaveBeenCalled();

    disposeOwnedRuntimeResources([runtimeB]);
    expect(runtimeB.dispose).toHaveBeenCalledTimes(1);
  });

  test('configuration-only updates do not require runtime resource disposal', () => {
    const runtimeResource = createResource();
    markRuntimeOwnedResources([runtimeResource]);

    expect(runtimeResource.dispose).not.toHaveBeenCalled();
  });
});
