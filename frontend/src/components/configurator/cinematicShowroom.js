import { isCameraPresetSupported } from '../../state/configuratorStore';

export const CINEMATIC_SEQUENCE = [
  'exterior',
  'front',
  'left',
  'rear',
  'right',
  'top',
  'interior',
  'cockpit',
];

export function buildCinematicSequence(supportedInteractions, cameraPresetNames) {
  const sequence = CINEMATIC_SEQUENCE.filter((preset) => (
    isCameraPresetSupported(supportedInteractions, preset)
  ));

  if (!Array.isArray(cameraPresetNames)) return sequence;
  const declared = new Set(cameraPresetNames);
  return sequence.filter((preset) => declared.has(preset));
}

export function getNextCinematicPreset(sequence, currentPreset) {
  if (!sequence.length) return null;
  const currentIndex = sequence.indexOf(currentPreset);
  return sequence[(currentIndex + 1) % sequence.length];
}
