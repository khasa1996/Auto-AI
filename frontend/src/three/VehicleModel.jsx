/**
 * VehicleModel — GLB/GLTF loader with semantic material system.
 *
 * Rules enforced:
 *  - Never loads or substitutes a non-GLB/GLTF asset as a 3D model.
 *  - Paint changes use asset-provided material name list, not fragile heuristics.
 *  - When no asset URL is provided, renders nothing (caller shows Coming Soon).
 *  - Clones scene to avoid shared material mutation across instances.
 *  - Disposes geometry/materials on unmount to prevent GPU memory leaks.
 *
 * Status: FOUNDATION — renders real GLB assets when provided.
 *   Material mapping:    IMPLEMENTED (metadata-driven via paintMaterialNames)
 *   Wheel mesh swap:     FOUNDATION (wheelMeshNames mapping defined, swap Phase 3)
 *   Animation playback:  see AnimationController.jsx
 */

import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Apply a paint color to all body-paint materials in the scene.
 * Uses the asset's declared paintMaterialNames list — never guesses by name substring.
 *
 * @param {THREE.Object3D} scene - Cloned scene root
 * @param {string} colorHex - e.g. "#B91C1C"
 * @param {string[]} paintMaterialNames - From asset metadata, e.g. ["MAT_BODY_PAINT"]
 */
function applyPaintColor(scene, colorHex, paintMaterialNames) {
  if (!scene || !colorHex || !paintMaterialNames?.length) return;

  const targetNames = new Set(paintMaterialNames.map((n) => n.toLowerCase()));
  const color = new THREE.Color(colorHex);

  scene.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((mat) => {
      if (!mat) return;
      const matName = (mat.name || '').toLowerCase();
      if (targetNames.has(matName)) {
        mat.color.copy(color);
        mat.needsUpdate = true;
      }
    });
  });
}

/**
 * Inner component — only rendered when a verified URL is available.
 * Separated so useGLTF is not called with an empty/null URL.
 */
function LoadedVehicle({ url, paintColorHex, paintMaterialNames }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef();

  // Clone scene so material mutations don't affect the shared GLTF cache
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((node) => {
      if (!node.isMesh) return;
      // Deep-clone materials so paint changes are isolated to this instance
      node.material = Array.isArray(node.material)
        ? node.material.map((m) => m.clone())
        : node.material.clone();
    });
    return clone;
  }, [scene]);

  // Apply paint color when it changes
  useEffect(() => {
    if (paintColorHex && paintMaterialNames?.length) {
      applyPaintColor(clonedScene, paintColorHex, paintMaterialNames);
    }
  }, [clonedScene, paintColorHex, paintMaterialNames]);

  // Dispose cloned materials on unmount
  useEffect(() => {
    return () => {
      clonedScene.traverse((node) => {
        if (!node.isMesh) return;
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        mats.forEach((m) => m?.dispose());
        node.geometry?.dispose();
      });
    };
  }, [clonedScene]);

  return <primitive ref={groupRef} object={clonedScene} />;
}

/**
 * VehicleModel — public component used by the configurator scene.
 *
 * @param {object} props
 * @param {string|null} props.url          - Verified HTTPS GLB/GLTF URL, or null
 * @param {string}      props.paintColorHex - e.g. "#B91C1C"
 * @param {string[]}    props.paintMaterialNames - From asset metadata
 */
export default function VehicleModel({ url, paintColorHex, paintMaterialNames = [] }) {
  // Guard: never attempt to load a null/empty URL or non-3D extension
  if (!url) return null;

  const lower = url.toLowerCase();
  if (!lower.endsWith('.glb') && !lower.endsWith('.gltf')) {
    console.error(
      '[VehicleModel] Rejected non-GLB/GLTF URL. Auto AI India does not ' +
        'use images or videos as 3D vehicle assets.',
      url
    );
    return null;
  }

  return (
    <LoadedVehicle
      url={url}
      paintColorHex={paintColorHex}
      paintMaterialNames={paintMaterialNames}
    />
  );
}
