import { buildCinematicSequence, getNextCinematicPreset } from './cinematicShowroom';

test('buildCinematicSequence keeps only camera presets supported by the verified asset', () => {
  expect(buildCinematicSequence(['camera_exterior'])).toEqual([
    'exterior',
    'front',
    'left',
    'rear',
    'right',
    'top',
  ]);
});

test('buildCinematicSequence includes interior only when the asset declares an interior camera', () => {
  expect(buildCinematicSequence(['camera_exterior', 'camera_interior'])).toEqual([
    'exterior',
    'front',
    'left',
    'rear',
    'right',
    'top',
    'interior',
    'cockpit',
  ]);
});

test('getNextCinematicPreset wraps to the first supported preset', () => {
  const sequence = ['front', 'rear', 'right'];
  expect(getNextCinematicPreset(sequence, 'rear')).toBe('right');
  expect(getNextCinematicPreset(sequence, 'right')).toBe('front');
  expect(getNextCinematicPreset(sequence, 'unknown')).toBe('front');
});
