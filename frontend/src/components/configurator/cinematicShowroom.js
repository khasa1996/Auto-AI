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

export function buildCinematicSequence(supportedInteractions) {
  return CINEMATIC_SEQUENCE.filter((preset) => (
    isCameraPresetSupported(supportedInteractions, preset)
  ));
}

export function getNextCinematicPreset(sequence, currentPreset) {
  if (!sequence.length) return null;
  const currentIndex = sequence.indexOf(currentPreset);
  return sequence[(currentIndex + 1) % sequence.length];
}
