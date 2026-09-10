/**
 * AnimationController — semantic animation playback for vehicle interactions.
 *
 * Semantic animation names (must match GLB animation clip names):
 *   Door_FL_Open / Door_FL_Close
 *   Door_FR_Open / Door_FR_Close
 *   Door_RL_Open / Door_RL_Close
 *   Door_RR_Open / Door_RR_Close
 *   Hood_Open    / Hood_Close
 *   Boot_Open    / Boot_Close
 *   Sunroof_Open / Sunroof_Close
 *   Frunk_Open   / Frunk_Close
 *
 * Rules:
 *  - Missing animations are silently ignored — no fake movement substituted.
 *  - Rapid repeated clicks are handled via a playing-set lock.
 *  - All animations are cleaned up on unmount / scene change.
 *
 * Status: FOUNDATION — controller is wired. Actual playback requires a
 *   GLB asset that contains the named animation clips.
 */

import { useEffect, useRef } from 'react';
import { useAnimations } from '@react-three/drei';

/** Semantic names for every supported vehicle interaction animation. */
export const ANIMATION_NAMES = {
  DOOR_FL_OPEN:   'Door_FL_Open',
  DOOR_FL_CLOSE:  'Door_FL_Close',
  DOOR_FR_OPEN:   'Door_FR_Open',
  DOOR_FR_CLOSE:  'Door_FR_Close',
  DOOR_RL_OPEN:   'Door_RL_Open',
  DOOR_RL_CLOSE:  'Door_RL_Close',
  DOOR_RR_OPEN:   'Door_RR_Open',
  DOOR_RR_CLOSE:  'Door_RR_Close',
  HOOD_OPEN:      'Hood_Open',
  HOOD_CLOSE:     'Hood_Close',
  BOOT_OPEN:      'Boot_Open',
  BOOT_CLOSE:     'Boot_Close',
  SUNROOF_OPEN:   'Sunroof_Open',
  SUNROOF_CLOSE:  'Sunroof_Close',
  FRUNK_OPEN:     'Frunk_Open',
  FRUNK_CLOSE:    'Frunk_Close',
};

/**
 * useVehicleAnimations — hook that wraps useAnimations with safety guards.
 *
 * @param {THREE.AnimationClip[]} clips - From useGLTF
 * @param {React.RefObject}       ref   - Scene group ref
 * @returns {{ play: (name: string) => void, availableAnimations: Set<string> }}
 */
export function useVehicleAnimations(clips, ref) {
  const { actions, mixer } = useAnimations(clips, ref);
  const playingRef = useRef(new Set());

  const availableAnimations = new Set(Object.keys(actions));

  function play(animationName) {
    const action = actions[animationName];

    if (!action) {
      // Animation not present in this asset — silently ignore.
      // Never substitute fake movement.
      return;
    }

    if (playingRef.current.has(animationName)) {
      // Already playing — ignore rapid repeated clicks
      return;
    }

    playingRef.current.add(animationName);
    action.reset();
    action.setLoop(THREE_LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();

    // Remove from playing set when animation finishes
    const onFinished = (e) => {
      if (e.action === action) {
        playingRef.current.delete(animationName);
        mixer.removeEventListener('finished', onFinished);
      }
    };
    mixer.addEventListener('finished', onFinished);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      playingRef.current.clear();
      mixer?.stopAllAction();
    };
  }, [mixer]);

  return { play, availableAnimations };
}

// THREE.LoopOnce = 2200 (avoid importing full THREE in hooks)
const THREE_LoopOnce = 2200;
