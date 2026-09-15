import { projectRuntimeConfiguration } from './runtimeConfiguration';

test('projects purchasable state and supported interactions into a stable runtime configuration', () => {
  expect(projectRuntimeConfiguration(
    {
      variantId: 'variant-1',
      paintId: 'red-01',
      wheelId: 'wheel-sport',
      interiorId: 'black-leather',
      roofId: 'glass-roof',
      accessoryIds: ['spoiler', 'mat-kit'],
    },
    {
      supportedInteractions: ['camera_exterior', 'doors', 'hood'],
      version: 'v3',
    },
  )).toEqual({
    variantId: 'variant-1',
    paintId: 'red-01',
    wheelId: 'wheel-sport',
    interiorId: 'black-leather',
    roofId: 'glass-roof',
    accessoryIds: ['spoiler', 'mat-kit'],
    assetVersion: 'v3',
    supportedInteractions: ['camera_exterior', 'doors', 'hood'],
  });
});

test('returns a deterministic empty configuration when inputs are incomplete', () => {
  expect(projectRuntimeConfiguration()).toEqual({
    variantId: null,
    paintId: null,
    wheelId: null,
    interiorId: null,
    roofId: null,
    accessoryIds: [],
    assetVersion: null,
    supportedInteractions: [],
  });
});
