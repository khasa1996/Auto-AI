/**
 * VehicleModel — GLB/GLTF loader with semantic material and animation systems.
 *
 * Rules enforced:
 *  - Never loads or substitutes a non-GLB/GLTF asset as a 3D model.
 *  - Paint changes use asset-provided material name list, not fragile heuristics.
 *  - Animations use the semantic clip contract from AnimationController.
 *  - Missing animation clips are ignored; no fake movement is substituted.
 *  - Clones scene and materials to isolate instances.
 *  - Disposes cloned geometry/materials on unmount to prevent GPU leaks.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ANIMATION_NAMES, useVehicleAnimations } from './AnimationController';

function applyPaintColor(scene, colorHex, paintMaterialNames) {
  if (!scene || !colorHex || !paintMaterialNames?.length) return;

  const targetNames = new Set(paintMaterialNames.map((name) => name.toLowerCase()));
  const color = new THREE.Color(colorHex);

  scene.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (!material) return;
      const materialName = (material.name || '').toLowerCase();
      if (targetNames.has(materialName)) {
        material.color.copy(color);
        material.needsUpdate = true;
      }
    });
  });
}

function LoadedVehicle({
  url,
  paintColorHex,
  paintMaterialNames,
  interaction,
}) {
  const { scene, animations } = useGLTF(url);
  const groupRef = useRef();
  const previousInteractionRef = useRef(null);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((node) => {
      if (!node.isMesh) return;
      node.material = Array.isArray(node.material)
        ? node.material.map((material) => material.clone())
        : node.material.clone();
    });
    return clone;
  }, [scene]);

  const { play } = useVehicleAnimations(animations, groupRef);

  useEffect(() => {
    if (paintColorHex && paintMaterialNames?.length) {
      applyPaintColor(clonedScene, paintColorHex, paintMaterialNames);
    }
  }, [clonedScene, paintColorHex, paintMaterialNames]);

  useEffect(() => {
    const previous = previousInteractionRef.current;
    previousInteractionRef.current = interaction;
    if (!previous) return;

    const playToggle = (current, before, openName, closeName) => {
      if (current === before) return;
      play(current ? openName : closeName);
    };

    playToggle(
      interaction.doors.frontLeft,
      previous.doors.frontLeft,
      ANIMATION_NAMES.DOOR_FL_OPEN,
      ANIMATION_NAMES.DOOR_FL_CLOSE,
    );
    playToggle(
      interaction.doors.frontRight,
      previous.doors.frontRight,
      ANIMATION_NAMES.DOOR_FR_OPEN,
      ANIMATION_NAMES.DOOR_FR_CLOSE,
    );
    playToggle(
      interaction.doors.rearLeft,
      previous.doors.rearLeft,
      ANIMATION_NAMES.DOOR_RL_OPEN,
      ANIMATION_NAMES.DOOR_RL_CLOSE,
    );
    playToggle(
      interaction.doors.rearRight,
      previous.doors.rearRight,
      ANIMATION_NAMES.DOOR_RR_OPEN,
      ANIMATION_NAMES.DOOR_RR_CLOSE,
    );
    playToggle(
      interaction.hoodOpen,
      previous.hoodOpen,
      ANIMATION_NAMES.HOOD_OPEN,
      ANIMATION_NAMES.HOOD_CLOSE,
    );
    playToggle(
      interaction.bootOpen,
      previous.bootOpen,
      ANIMATION_NAMES.BOOT_OPEN,
      ANIMATION_NAMES.BOOT_CLOSE,
    );
    playToggle(
      interaction.frunkOpen,
      previous.frunkOpen,
      ANIMATION_NAMES.FRUNK_OPEN,
      ANIMATION_NAMES.FRUNK_CLOSE,
    );
    playToggle(
      interaction.sunroofOpen,
      previous.sunroofOpen,
      ANIMATION_NAMES.SUNROOF_OPEN,
      ANIMATION_NAMES.SUNROOF_CLOSE,
    );
  }, [interaction, play]);

  useEffect(() => {
    return () => {
      clonedScene.traverse((node) => {
        if (!node.isMesh) return;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => material?.dispose());
        node.geometry?.dispose();
      });
    };
  }, [clonedScene]);

  return <primitive ref={groupRef} object={clonedScene} />;
}

export default function VehicleModel({
  url,
  paintColorHex,
  paintMaterialNames = [],
  interaction,
}) {
  if (!url) return null;

  const lower = url.toLowerCase();
  if (!lower.endsWith('.glb') && !lower.endsWith('.gltf')) {
    console.error(
      '[VehicleModel] Rejected non-GLB/GLTF URL. Auto AI India does not use images or videos as 3D vehicle assets.',
      url,
    );
    return null;
  }

  return (
    <LoadedVehicle
      url={url}
      paintColorHex={paintColorHex}
      paintMaterialNames={paintMaterialNames}
      interaction={interaction}
    />
  );
}
