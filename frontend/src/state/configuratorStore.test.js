import { isCameraPresetSupported } from './configuratorStore';

test('maps exterior presets to the verified exterior camera capability', () => {
  expect(isCameraPresetSupported(['camera_exterior'], 'front')).toBe(true);
  expect(isCameraPresetSupported(['camera_exterior'], 'top')).toBe(true);
  expect(isCameraPresetSupported(['camera_interior'], 'front')).toBe(false);
});

test('requires both exterior camera and boot capability for the boot view', () => {
  expect(isCameraPresetSupported(['camera_exterior', 'boot'], 'boot')).toBe(true);
  expect(isCameraPresetSupported(['camera_exterior'], 'boot')).toBe(false);
});

test('maps interior presets to the verified interior camera capability', () => {
  expect(isCameraPresetSupported(['camera_interior'], 'interior')).toBe(true);
  expect(isCameraPresetSupported(['camera_interior'], 'cockpit')).toBe(true);
  expect(isCameraPresetSupported(['camera_exterior'], 'cockpit')).toBe(false);
});

test('rejects unknown or malformed camera capabilities', () => {
  expect(isCameraPresetSupported([], 'exterior')).toBe(false);
  expect(isCameraPresetSupported(null, 'exterior')).toBe(false);
  expect(isCameraPresetSupported(['camera_exterior'], 'unknown')).toBe(false);
});
