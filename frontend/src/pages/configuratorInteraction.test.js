import { getInteractionCapability } from './configuratorInteraction';

describe('configurator interaction capability mapping', () => {
  test('maps each control to the semantic asset capability', () => {
    expect(getInteractionCapability('Hood')).toBe('hood');
    expect(getInteractionCapability('Boot')).toBe('boot');
    expect(getInteractionCapability('Sunroof')).toBe('sunroof');
    expect(getInteractionCapability('Door FL')).toBe('doors');
    expect(getInteractionCapability('Headlights')).toBe('headlights');
    expect(getInteractionCapability('DRL')).toBe('drl');
    expect(getInteractionCapability('Hazard')).toBe('hazard');
  });

  test('does not confuse animation clip names with asset capabilities', () => {
    expect(getInteractionCapability('Door_FL_Open')).toBeNull();
    expect(getInteractionCapability('Hood_Open')).toBeNull();
  });
});
