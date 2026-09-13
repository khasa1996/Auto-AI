export const INTERACTION_CONTROLS = [
  { id: 'doors', label: 'Doors', capability: 'doors', group: 'vehicle' },
  { id: 'hood', label: 'Bonnet', capability: 'hood', group: 'vehicle' },
  { id: 'boot', label: 'Boot', capability: 'boot', group: 'vehicle' },
  { id: 'frunk', label: 'Frunk', capability: 'frunk', group: 'vehicle' },
  { id: 'sunroof', label: 'Sunroof', capability: 'sunroof', group: 'vehicle' },
  { id: 'headlights', label: 'Headlights', capability: 'headlights', group: 'lighting' },
  { id: 'drl', label: 'DRL', capability: 'drl', group: 'lighting' },
  { id: 'taillights', label: 'Tail lights', capability: 'taillights', group: 'lighting' },
  { id: 'fog_lights', label: 'Fog lights', capability: 'fog_lights', group: 'lighting' },
  { id: 'left_indicator', label: 'Left indicator', capability: 'left_indicator', group: 'lighting' },
  { id: 'right_indicator', label: 'Right indicator', capability: 'right_indicator', group: 'lighting' },
  { id: 'hazard', label: 'Hazard', capability: 'hazard', group: 'lighting' },
  { id: 'interior', label: 'Interior light', capability: 'interior_lights', group: 'lighting' },
];

export function getSupportedInteractionControls(supportedInteractions = []) {
  const supported = new Set(Array.isArray(supportedInteractions) ? supportedInteractions : []);
  return INTERACTION_CONTROLS.filter((control) => supported.has(control.capability));
}

export function getDoorControls(supportedInteractions = []) {
  return getSupportedInteractionControls(supportedInteractions).filter((control) => control.id === 'doors');
}
