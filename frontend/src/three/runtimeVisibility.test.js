import { applyRuntimeMeshVisibility } from './vehicleRuntime';

test('hides mapped meshes before showing only matched selections', () => {
  const sportWheel = { name: 'WheelSport', visible: true };
  const luxuryWheel = { name: 'WheelLuxury', visible: true };
  const index = new Map([
    ['WheelSport', sportWheel],
    ['WheelLuxury', luxuryWheel],
  ]);

  applyRuntimeMeshVisibility(index, ['sport'], {
    sport: 'WheelSport',
    luxury: 'WheelLuxury',
  });
  expect(sportWheel.visible).toBe(true);
  expect(luxuryWheel.visible).toBe(false);

  applyRuntimeMeshVisibility(index, ['missing'], {
    sport: 'WheelSport',
    luxury: 'WheelLuxury',
  });
  expect(sportWheel.visible).toBe(false);
  expect(luxuryWheel.visible).toBe(false);
});
