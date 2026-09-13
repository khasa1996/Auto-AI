import { getDoorControls, getSupportedInteractionControls } from './interactionControls';

test('only exposes controls declared by the verified asset', () => {
  expect(getSupportedInteractionControls(['doors', 'boot', 'headlights'])).toEqual([
    { id: 'doors', label: 'Doors', capability: 'doors', group: 'vehicle' },
    { id: 'boot', label: 'Boot', capability: 'boot', group: 'vehicle' },
    { id: 'headlights', label: 'Headlights', capability: 'headlights', group: 'lighting' },
  ]);
});

test('door control remains independently gated by the doors capability', () => {
  expect(getDoorControls(['camera_exterior'])).toEqual([]);
  expect(getDoorControls(['doors'])).toEqual([
    { id: 'doors', label: 'Doors', capability: 'doors', group: 'vehicle' },
  ]);
});
