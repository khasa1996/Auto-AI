import { projectVerifiedVisualConfiguration } from './runtimeVisualConfiguration';

test('retains only visual selections declared by the verified asset manifest', () => {
  expect(projectVerifiedVisualConfiguration(
    {
      variantId: 'variant-1',
      paintId: 'red-01',
      wheelId: 'wheel-sport',
      interiorId: 'black-leather',
      roofId: 'glass-roof',
      accessoryIds: ['spoiler', 'mat-kit', 'unknown-accessory'],
    },
    {
      wheelMeshNames: {
        'wheel-sport': ['WheelSport'],
      },
      interiorMaterialMappings: {
        'black-leather': ['LeatherBlack'],
      },
      optionMeshNames: {
        'glass-roof': ['RoofGlass'],
        spoiler: ['Spoiler'],
        'mat-kit': ['MatKit'],
      },
    },
  )).toEqual({
    variantId: 'variant-1',
    paintId: 'red-01',
    wheelId: 'wheel-sport',
    interiorId: 'black-leather',
    roofId: 'glass-roof',
    accessoryIds: ['spoiler', 'mat-kit'],
  });
});

test('does not invent visual selections when the manifest has no mappings', () => {
  expect(projectVerifiedVisualConfiguration(
    {
      paintId: 'red-01',
      wheelId: 'wheel-sport',
      interiorId: 'black-leather',
      roofId: 'glass-roof',
      accessoryIds: ['spoiler'],
    },
    {},
  )).toEqual({
    variantId: null,
    paintId: 'red-01',
    wheelId: null,
    interiorId: null,
    roofId: null,
    accessoryIds: [],
  });
});
