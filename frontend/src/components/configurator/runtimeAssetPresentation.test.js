import { getRuntimeAssetPresentation } from './runtimeAssetPresentation';

test('marks OEM-authorized runtime assets as verified', () => {
  expect(getRuntimeAssetPresentation({
    provenance: 'OEM_AUTHORIZED',
    published: true,
    validationPassed: true,
    adminReviewed: true,
  })).toEqual({
    badge: 'OEM-VERIFIED',
    disclosure: 'OEM-authorized 3D model.',
    isDemo: false,
  });
});

test('marks non-OEM runtime assets as demonstration models', () => {
  expect(getRuntimeAssetPresentation({
    provenance: 'LICENSED_THIRD_PARTY',
    published: true,
    validationPassed: true,
    adminReviewed: true,
  })).toEqual({
    badge: 'DEMO 3D MODEL',
    disclosure: 'Visual representation for configuration demonstration. OEM verification pending.',
    isDemo: true,
  });
});

test('does not claim OEM verification when publication gates are incomplete', () => {
  expect(getRuntimeAssetPresentation({
    provenance: 'OEM_AUTHORIZED',
    published: false,
    validationPassed: true,
    adminReviewed: true,
  })).toEqual({
    badge: 'DEMO 3D MODEL',
    disclosure: 'Visual representation for configuration demonstration. OEM verification pending.',
    isDemo: true,
  });
});
