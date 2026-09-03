/**
 * CameraPresets — named camera positions for the configurator.
 *
 * Auto-rotation pauses when the user interacts (orbit drag/pinch).
 * Desktop: mouse orbit, scroll zoom, keyboard shortcuts.
 * Mobile: one-finger orbit, pinch zoom.
 *
 * Status: IMPLEMENTED
 */

import { useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** Preset camera positions. All coordinates are world-space. */
export const CAMERA_PRESETS = {
  exterior:   { position: [4.5, 1.6, 5.5],  target: [0, 0.3, 0]  },
  front:      { position: [0,   1.2, 5.5],  target: [0, 0.5, 0]  },
  rear:       { position: [0,   1.2, -5.5], target: [0, 0.5, 0]  },
  left:       { position: [-5.5, 1.2, 0],   target: [0, 0.5, 0]  },
  right:      { position: [5.5,  1.2, 0],   target: [0, 0.5, 0]  },
  top:        { position: [0,   6.0, 0.1],  target: [0, 0,   0]  },
  interior:   { position: [0,   1.1, 0.8],  target: [0, 1.0, 0]  },
  cockpit:    { position: [-0.4, 1.2, 0.5], target: [0, 1.1, -2] },
  boot:       { position: [0,   1.2, -4.5], target: [0, 0.6, -2] },
  wheel:      { position: [2.2, 0.4, 1.8],  target: [1.5, 0.3, 1.5] },
};

/**
 * useCameraPreset — animates the camera to a named preset.
 *
 * @param {string|null} preset - Key from CAMERA_PRESETS
 * @param {React.RefObject} controlsRef - OrbitControls ref
 */
export function useCameraPreset(preset, controlsRef) {
  const { camera } = useThree();

  useEffect(() => {
    if (!preset || !CAMERA_PRESETS[preset]) return;
    const { position, target } = CAMERA_PRESETS[preset];

    // Smoothly lerp camera position
    const targetPos = new THREE.Vector3(...position);
    const targetLook = new THREE.Vector3(...target);
    const startPos = camera.position.clone();

    let frame = 0;
    const FRAMES = 30;
    const id = setInterval(() => {
      frame++;
      const t = Math.min(frame / FRAMES, 1);
      const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out
      camera.position.lerpVectors(startPos, targetPos, ease);
      if (controlsRef?.current) {
        controlsRef.current.target.lerp(targetLook, ease);
        controlsRef.current.update();
      }
      if (frame >= FRAMES) clearInterval(id);
    }, 16);

    return () => clearInterval(id);
  }, [preset]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * ConfiguratorControls — OrbitControls wired to auto-rotation state.
 *
 * @param {boolean}          autoRotate     - From configurator store interaction state
 * @param {function}         onInteract     - Called when user starts dragging (pauses auto-rotate)
 * @param {React.RefObject}  controlsRef
 */
export function ConfiguratorControls({ autoRotate, onInteract, controlsRef }) {
  const internalRef = controlsRef || useRef();

  return (
    <OrbitControls
      ref={internalRef}
      makeDefault
      enablePan={false}
      autoRotate={autoRotate}
      autoRotateSpeed={0.8}
      minDistance={2.5}
      maxDistance={10}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 1.9}
      rotateSpeed={0.7}
      enableDamping
      dampingFactor={0.08}
      // Pause auto-rotation when user grabs the model
      onStart={onInteract}
    />
  );
}
