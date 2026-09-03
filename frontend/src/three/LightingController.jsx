/**
 * LightingController — vehicle lighting system for the 3D configurator.
 *
 * Lighting is a SHOWROOM INTERACTION — it does NOT affect vehicle price.
 *
 * When a light is toggled ON:
 *   1. Emissive material values are updated on named mesh materials.
 *   2. Actual THREE.js PointLights/SpotLights are added for headlights/taillights.
 *
 * Indicators blink (via setInterval). Hazard = both indicators blinking.
 *
 * Status: FOUNDATION
 *   Emissive material updates:  IMPLEMENTED (requires named materials in asset)
 *   PointLight headlights:       IMPLEMENTED
 *   Indicator blinking:          IMPLEMENTED
 *   Fog light volumes:           FOUNDATION (Phase 3 — needs asset geometry)
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/** Semantic material names for lighting surfaces in the vehicle GLB. */
export const LIGHTING_MATERIAL_NAMES = {
  HEADLIGHT:       'MAT_HEADLIGHT',
  DRL:             'MAT_DRL',
  TAILLIGHT:       'MAT_TAILLIGHT',
  FOG_LIGHT:       'MAT_FOGLIGHT',
  LEFT_INDICATOR:  'MAT_INDICATOR_L',
  RIGHT_INDICATOR: 'MAT_INDICATOR_R',
  INTERIOR_LIGHT:  'MAT_INTERIOR_LIGHT',
};

const INDICATOR_BLINK_MS = 500;

/**
 * useLightingController — applies lighting state to the 3D scene.
 *
 * @param {THREE.Object3D|null} scene         - Cloned vehicle scene
 * @param {object}              lightingState - From configurator store interaction.lighting
 */
export function useLightingController(scene, lightingState) {
  const headlightRef = useRef(null);
  const taillightRef = useRef(null);
  const indicatorTimerRef = useRef(null);

  // ── Emissive material updates ──────────────────────────────────────────
  useEffect(() => {
    if (!scene) return;

    const targets = {
      [LIGHTING_MATERIAL_NAMES.HEADLIGHT]:       lightingState.headlights,
      [LIGHTING_MATERIAL_NAMES.DRL]:             lightingState.drl,
      [LIGHTING_MATERIAL_NAMES.TAILLIGHT]:       lightingState.taillights,
      [LIGHTING_MATERIAL_NAMES.FOG_LIGHT]:       lightingState.fog_lights,
      [LIGHTING_MATERIAL_NAMES.INTERIOR_LIGHT]:  lightingState.interior,
    };

    scene.traverse((node) => {
      if (!node.isMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((mat) => {
        if (!mat?.emissive) return;
        const matName = (mat.name || '').toUpperCase();
        if (Object.prototype.hasOwnProperty.call(targets, matName)) {
          const on = targets[matName];
          mat.emissive.set(on ? '#ffffff' : '#000000');
          mat.emissiveIntensity = on ? 2.0 : 0.0;
          mat.needsUpdate = true;
        }
      });
    });
  }, [scene, lightingState.headlights, lightingState.drl,
      lightingState.taillights, lightingState.fog_lights, lightingState.interior]);

  // ── Headlight PointLights ──────────────────────────────────────────────
  useEffect(() => {
    if (!scene) return;

    if (lightingState.headlights) {
      if (!headlightRef.current) {
        const light = new THREE.PointLight('#ffffee', 3, 8);
        light.position.set(0, 0.6, 2.5);
        scene.add(light);
        headlightRef.current = light;
      }
    } else {
      if (headlightRef.current) {
        scene.remove(headlightRef.current);
        headlightRef.current.dispose?.();
        headlightRef.current = null;
      }
    }
  }, [scene, lightingState.headlights]);

  useEffect(() => {
    if (!scene) return;
    if (lightingState.taillights) {
      if (!taillightRef.current) {
        const light = new THREE.PointLight('#ff2200', 1.5, 4);
        light.position.set(0, 0.5, -2.5);
        scene.add(light);
        taillightRef.current = light;
      }
    } else {
      if (taillightRef.current) {
        scene.remove(taillightRef.current);
        taillightRef.current.dispose?.();
        taillightRef.current = null;
      }
    }
  }, [scene, lightingState.taillights]);

  // ── Indicator blinking ─────────────────────────────────────────────────
  useEffect(() => {
    if (!scene) return;

    const leftOn  = lightingState.left_indicator || lightingState.hazard;
    const rightOn = lightingState.right_indicator || lightingState.hazard;

    if (!leftOn && !rightOn) {
      clearInterval(indicatorTimerRef.current);
      indicatorTimerRef.current = null;
      _setIndicatorEmissive(scene, 'left', false);
      _setIndicatorEmissive(scene, 'right', false);
      return;
    }

    let blink = false;
    indicatorTimerRef.current = setInterval(() => {
      blink = !blink;
      if (leftOn)  _setIndicatorEmissive(scene, 'left',  blink);
      if (rightOn) _setIndicatorEmissive(scene, 'right', blink);
    }, INDICATOR_BLINK_MS);

    return () => clearInterval(indicatorTimerRef.current);
  }, [scene, lightingState.left_indicator, lightingState.right_indicator, lightingState.hazard]);

  // Cleanup lights on unmount
  useEffect(() => {
    return () => {
      clearInterval(indicatorTimerRef.current);
      if (scene) {
        if (headlightRef.current)  scene.remove(headlightRef.current);
        if (taillightRef.current)  scene.remove(taillightRef.current);
      }
    };
  }, [scene]);
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
      if ((mat.name || '').toUpperCase() === matName) {
        mat.emissive.set(on ? '#ffaa00' : '#000000');
        mat.emissiveIntensity = on ? 3.0 : 0.0;
        mat.needsUpdate = true;
      }
    });
  });
}
