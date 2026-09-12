import { normalizeLightingState } from './LightingController';

test('keeps only lighting capabilities declared by the verified asset', () => {
  expect(normalizeLightingState({
    headlights: true,
    drl: true,
    taillights: true,
    fog_lights: true,
    left_indicator: true,
    right_indicator: true,
    hazard: true,
    interior: true,
  }, ['headlights', 'hazard'])).toEqual({
    headlights: true,
    drl: false,
    taillights: false,
    fog_lights: false,
    left_indicator: false,
    right_indicator: false,
    hazard: true,
    interior: false,
  });
});

test('rejects malformed capability lists without enabling lighting', () => {
  expect(normalizeLightingState({ headlights: true, hazard: true }, null)).toEqual({
    headlights: false,
    drl: false,
    taillights: false,
    fog_lights: false,
    left_indicator: false,
    right_indicator: false,
    hazard: false,
    interior: false,
  });
});
