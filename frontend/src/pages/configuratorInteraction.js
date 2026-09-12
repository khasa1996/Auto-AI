const CAPABILITIES = new Map([
  ['Hood', 'hood'],
  ['Boot', 'boot'],
  ['Sunroof', 'sunroof'],
  ['Frunk', 'frunk'],
  ['Headlights', 'headlights'],
  ['DRL', 'drl'],
  ['Taillights', 'taillights'],
  ['Fog lights', 'fog_lights'],
  ['Left indicator', 'left_indicator'],
  ['Right indicator', 'right_indicator'],
  ['Hazard', 'hazard'],
  ['Interior lights', 'interior_lights'],
  ['Door FL', 'doors'],
  ['Door FR', 'doors'],
  ['Door RL', 'doors'],
  ['Door RR', 'doors'],
]);

export function getInteractionCapability(label) {
  return CAPABILITIES.get(label) || null;
}

export function buildInteractionControls(store) {
  return [
    ['Hood', store.interaction.hoodOpen, store.toggleHood],
    ['Boot', store.interaction.bootOpen, store.toggleBoot],
    ['Frunk', store.interaction.frunkOpen, store.toggleFrunk],
    ['Sunroof', store.interaction.sunroofOpen, store.toggleSunroof],
    ['Headlights', store.interaction.lighting.headlights, () => store.toggleLight('headlights')],
    ['DRL', store.interaction.lighting.drl, () => store.toggleLight('drl')],
    ['Taillights', store.interaction.lighting.taillights, () => store.toggleLight('taillights')],
    ['Fog lights', store.interaction.lighting.fog_lights, () => store.toggleLight('fog_lights')],
    ['Left indicator', store.interaction.lighting.left_indicator, () => store.toggleLight('left_indicator')],
    ['Right indicator', store.interaction.lighting.right_indicator, () => store.toggleLight('right_indicator')],
    ['Hazard', store.interaction.lighting.hazard, store.toggleHazard],
    ['Interior lights', store.interaction.lighting.interior, () => store.toggleLight('interior')],
    ['Door FL', store.interaction.doors.frontLeft, () => store.toggleDoor('frontLeft')],
    ['Door FR', store.interaction.doors.frontRight, () => store.toggleDoor('frontRight')],
    ['Door RL', store.interaction.doors.rearLeft, () => store.toggleDoor('rearLeft')],
    ['Door RR', store.interaction.doors.rearRight, () => store.toggleDoor('rearRight')],
  ].map(([label, active, action]) => ({
    label,
    capability: getInteractionCapability(label),
    active,
    action,
  }));
}
