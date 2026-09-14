import { getInteractionPreviousValue } from './interactionRuntime';

test('reads previous interaction values without changing the interaction shape', () => {
  const previous = { bootOpen: true, frunkOpen: false, sunroofOpen: true };

  expect(getInteractionPreviousValue(previous, 'bootOpen')).toBe(true);
  expect(getInteractionPreviousValue(previous, 'frunkOpen')).toBe(false);
  expect(getInteractionPreviousValue(previous, 'sunroofOpen')).toBe(true);
});
