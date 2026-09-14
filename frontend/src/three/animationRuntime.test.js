import { filterAvailableAnimationMappings } from './animationRuntime';

test('keeps only manifest animation mappings whose clips exist in the loaded GLB', () => {
  expect(filterAvailableAnimationMappings({
    doors: {
      front_left_open: 'DoorFL_Open',
      front_left_close: 'DoorFL_Close',
      rear_left_open: 'MissingClip',
    },
    hood: { open: 'Hood_Open' },
  }, ['DoorFL_Open', 'DoorFL_Close', 'Hood_Open'])).toEqual({
    doors: {
      front_left_open: 'DoorFL_Open',
      front_left_close: 'DoorFL_Close',
    },
    hood: { open: 'Hood_Open' },
  });
});
