/**
 * LightingController — vehicle lighting system for the 3D configurator.
 *
 * Lighting is a SHOWROOM INTERACTION — it does NOT affect vehicle price.
 *
 * The controller accepts either a scene Object3D or a React ref. Using the ref
 * form prevents the first render from missing the scene because React assigns
 * object refs after render and before effects run.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/** Semantic material names for lighting surfaces in the vehicle GLB. */
export const LIGHTING_MATERIAL_NAMES = {
  HEADLIGHT: 'MAT_HEADLIGHT',
  DRL: 'MAT_DRL',
  TAILLIGHT: 'MAT_TAILLIGHT',
  FOG_LIGHT: 'MAT_FOGLIGHT',
  LEFT_INDICATOR: 'MAT_INDICATOR_L',
  RIGHT_INDICATOR: 'MAT_INDICATOR_R',
  INTERIOR_LIGHT: 'MAT_INTERIOR_LIGHT',
};

const INDICATOR_BLINK_MS = 500;

export function normalizeLightingState(lightingState = {}, supportedInteractions) {
  const supported = new Set(Array.isArray(supportedInteractions) ? supportedInteractions : []);
  const isSupported = (capability) => supported.has(capability);
  return {
    headlights: Boolean(lightingState.headlights && isSupported('headlights')),
    drl: Boolean(lightingState.drl && isSupported('drl')),
    taillights: Boolean(lightingState.taillights && isSupported('taillights')),
    fog_lights: Boolean(lightingState.fog_lights && isSupported('fog_lights')),
    left_indicator: Boolean(lightingState.left_indicator && isSupported('left_indicator')),
    right_indicator: Boolean(lightingState.right_indicator && isSupported('right_indicator')),
    hazard: Boolean(lightingState.hazard && isSupported('hazard')),
    interior: Boolean(lightingState.interior && isSupported('interior_lights')),
  };
}

/**
 * useLightingController — applies lighting state to the 3D scene.
 *
 * @param {THREE.Object3D|React.RefObject} sceneOrRef - Vehicle scene/group or ref
 * @param {object} lightingState - From configurator store interaction.lighting
 * @param {string[]} supportedInteractions - Verified asset capabilities
 */
export function useLightingController(sceneOrRef, lightingState, supportedInteractions = []) {
  const headlightRef = useRef(null);
  const taillightRef = useRef(null);
  const indicatorTimerRef = useRef(null);
  const normalizedLighting = normalizeLightingState(lightingState, supportedInteractions);

  const getScene = () => sceneOrRef?.current ?? sceneOrRef ?? null;

  useEffect(() => {
    const scene = getScene();
    if (!scene) return undefined;

    const targets = {
      [LIGHTING_MATERIAL_NAMES.HEADLIGHT]: normalizedLighting.headlights,
      [LIGHTING_MATERIAL_NAMES.DRL]: normalizedLighting.drl,
      [LIGHTING_MATERIAL_NAMES.TAILLIGHT]: normalizedLighting.taillights,
      [LIGHTING_MATERIAL_NAMES.FOG_LIGHT]: normalizedLighting.fog_lights,
      [LIGHTING_MATERIAL_NAMES.INTERIOR_LIGHT]: normalizedLighting.interior,
    };

    scene.traverse((node) => {
      if (!node.isMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((mat) => {
        if (!mat?.emissive) return;
        const matName = (mat.name || '').toUpperCase();
        if (!Object.prototype.hasOwnProperty.call(targets, matName)) return;
        const on = targets[matName];
        mat.emissive.set(on ? '#ffffff' : '#000000');
        mat.emissiveIntensity = on ? 2.0 : 0.0;
        mat.needsUpdate = true;
      });
    });

    return undefined;
  }, [sceneOrRef, normalizedLighting.headlights, normalizedLighting.drl,
      normalizedLighting.taillights, normalizedLighting.fog_lights, normalizedLighting.interior]);

  useEffect(() => {
    const scene = getScene();
    if (!scene) return undefined;

    if (normalizedLighting.headlights) {
      if (!headlightRef.current) {
        const light = new THREE.PointLight('#ffffee', 3, 8);
        light.position.set(0, 0.6, 2.5);
        scene.add(light);
        headlightRef.current = light;
      }
    } else if (headlightRef.current) {
      scene.remove(headlightRef.current);
      headlightRef.current = null;
    }

    return undefined;
  }, [sceneOrRef, normalizedLighting.headlights]);

  useEffect(() => {
    const scene = getScene();
    if (!scene) return undefined;

    if (normalizedLighting.taillights) {
      if (!taillightRef.current) {
        const light = new THREE.PointLight('#ff2200', 1.5, 4);
        light.position.set(0, 0.5, -2.5);
        scene.add(light);
        taillightRef.current = light;
      }
    } else if (taillightRef.current) {
      scene.remove(taillightRef.current);
      taillightRef.current = null;
    }

    return undefined;
  }, [sceneOrRef, normalizedLighting.taillights]);

  useEffect(() => {
    const scene = getScene();
    if (!scene) return undefined;

    const leftOn = normalizedLighting.left_indicator || normalizedLighting.hazard;
    const rightOn = normalizedLighting.right_indicator || normalizedLighting.hazard;

    clearInterval(indicatorTimerRef.current);
    indicatorTimerRef.current = null;

    _setIndicatorEmissive(scene, 'left', false);
    _setIndicatorEmissive(scene, 'right', false);

    if (!leftOn && !rightOn) return undefined;

    let blink = false;
    indicatorTimerRef.current = setInterval(() => {
      blink = !blink;
      if (leftOn) _setIndicatorEmissive(scene, 'left', blink);
      if (rightOn) _setIndicatorEmissive(scene, 'right', blink);
    }, INDICATOR_BLINK_MS);

    return () => {
      clearInterval(indicatorTimerRef.current);
      indicatorTimerRef.current = null;
    };
  }, [sceneOrRef, normalizedLighting.left_indicator, normalizedLighting.right_indicator, normalizedLighting.hazard]);

  useEffect(() => {
    return () => {
      clearInterval(indicatorTimerRef.current);
      indicatorTimerRef.current = null;

      const scene = getScene();
      if (scene) {
        if (headlightRef.current) {
          scene.remove(headlightRef.current);
          headlightRef.current = null;
        }
        if (taillightRef.current) {
          scene.remove(taillightRef.current);
          taillightRef.current = null;
        }
      }
    };
  }, [sceneOrRef]);
}

function _setIndicatorEmissive(scene, side, on) {
  const matName = side === 'left'
    ? LIGHTING_MATERIAL_NAMES.LEFT_INDICATOR.toUpperCase()
    : LIGHTING_MATERIAL_NAMES.RIGHT_INDICATOR.toUpperCase();

  scene.traverse((node) => {
    if (!node.isMesh) return;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    mats.forEach((mat) => {
      if (!mat?.emissive) return;
      if ((mat.name || '').toUpperCase() !== matName) return;
      mat.emissive.set(on ? '#ffaa00' : '#000000');
      mat.emissiveIntensity = on ? 3.0 : 0.0;
      mat.needsUpdate = true;
    });
  });
}
