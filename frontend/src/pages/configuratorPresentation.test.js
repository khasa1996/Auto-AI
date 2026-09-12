import {
  buildPurchasablePayload,
  getCameraPresets,
  getOptionGroups,
  getValidationMessages,
  isInteractionSupported,
} from './configuratorPresentation';

test('builds the backend purchasable payload without interaction state', () => {
  expect(buildPurchasablePayload({
    variantId: 'v1',
    paintId: 'p1',
    wheelId: 'w1',
    interiorId: 'i1',
    roofId: 'r1',
    accessoryIds: ['a1'],
  })).toEqual({
    variant_id: 'v1',
    paint_id: 'p1',
    wheel_id: 'w1',
    interior_id: 'i1',
    roof_id: 'r1',
    accessory_ids: ['a1'],
  });
});

test('groups only backend-provided option collections', () => {
  const options = {
    colors: [{ color_id: 'p1' }],
    wheels: [{ wheel_id: 'w1' }],
    interiors: [{ interior_id: 'i1' }],
    roofs: [{ option_id: 'r1' }],
    accessories: [{ option_id: 'a1' }],
  };

  expect(getOptionGroups(options).map((group) => group.key)).toEqual([
    'colors', 'wheels', 'interiors', 'roofs', 'accessories',
  ]);
});

test('normalizes backend validation messages', () => {
  expect(getValidationMessages({
    valid: false,
    errors: ['Wheel is incompatible', 'Roof requires a supported variant'],
    warnings: ['Price is an estimate'],
  })).toEqual({
    errors: ['Wheel is incompatible', 'Roof requires a supported variant'],
    warnings: ['Price is an estimate'],
  });
});

test('does not enable unsupported showroom interactions', () => {
  expect(isInteractionSupported(['doors'], 'Door_FL_Open')).toBe(true);
  expect(isInteractionSupported(['doors'], 'Door_FR_Open')).toBe(true);
  expect(isInteractionSupported(['hood'], 'Hood_Open')).toBe(true);
  expect(isInteractionSupported(['Door_FL_Open'], 'Door_FR_Open')).toBe(false);
});

test('filters camera presets to capabilities declared by the verified asset', () => {
  expect(getCameraPresets(['camera_exterior', 'camera_interior', 'boot'])).toEqual([
    'exterior', 'front', 'rear', 'left', 'right', 'top', 'interior', 'cockpit', 'boot', 'wheel',
  ]);
  expect(getCameraPresets(['camera_exterior'])).toEqual([
    'exterior', 'front', 'rear', 'left', 'right', 'top', 'wheel',
  ]);
  expect(getCameraPresets([])).toEqual([]);
});
