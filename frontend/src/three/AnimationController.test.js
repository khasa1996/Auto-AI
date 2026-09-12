import { ANIMATION_NAMES, resolveAnimationName } from './AnimationController';

test('uses exact animation names declared by the verified asset', () => {
  expect(resolveAnimationName(
    { doors: { front_left_open: 'DriverDoor_Open_01' } },
    'doors',
    'front_left_open',
    ANIMATION_NAMES.DOOR_FL_OPEN,
  )).toBe('DriverDoor_Open_01');
});

test('falls back to canonical semantic animation names when no mapping exists', () => {
  expect(resolveAnimationName({}, 'hood', 'open', ANIMATION_NAMES.HOOD_OPEN)).toBe('Hood_Open');
});
