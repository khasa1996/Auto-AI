import {
  CAMERA_PRESETS,
  CAMERA_TRANSITION_DURATION_MS,
  easeCameraTransition,
  getCameraTransitionDuration,
  resolveCameraPreset,
} from './CameraPresets';

describe('camera transitions', () => {
  test('defines every supported camera preset', () => {
    expect(Object.keys(CAMERA_PRESETS)).toEqual(expect.arrayContaining([
      'exterior',
      'front',
      'rear',
      'left',
      'right',
      'top',
      'interior',
      'cockpit',
      'boot',
      'wheel',
    ]));
  });

  test('clamps and eases transition progress', () => {
    expect(easeCameraTransition(-1)).toBe(0);
    expect(easeCameraTransition(0)).toBe(0);
    expect(easeCameraTransition(0.5)).toBe(0.5);
    expect(easeCameraTransition(1)).toBe(1);
    expect(easeCameraTransition(2)).toBe(1);
    expect(easeCameraTransition(0.25)).toBeLessThan(0.25);
    expect(easeCameraTransition(0.75)).toBeGreaterThan(0.75);
  });

  test('uses the cinematic duration unless reduced motion is requested', () => {
    expect(getCameraTransitionDuration()).toBe(CAMERA_TRANSITION_DURATION_MS);
    expect(getCameraTransitionDuration(false)).toBe(650);
    expect(getCameraTransitionDuration(true)).toBe(0);
  });

  test('resolves only camera presets declared by the verified runtime manifest', () => {
    expect(resolveCameraPreset('exterior', ['exterior', 'rear'])).toEqual({
      position: [4.5, 1.6, 5.5],
      target: [0, 0.3, 0],
    });
    expect(resolveCameraPreset('interior', ['exterior', 'rear'])).toBeNull();
  });

  test('does not treat an empty verified camera declaration as all presets', () => {
    expect(resolveCameraPreset('exterior', [])).toBeNull();
  });
});
