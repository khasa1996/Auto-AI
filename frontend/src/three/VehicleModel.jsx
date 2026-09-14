/**
 * VehicleModel — GLB/GLTF loader with semantic material and animation systems.
 *
 * The viewer receives the complete verified asset manifest. No synthetic runtime
 * asset is created here, so the runtime cannot silently bypass asset validation.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ANIMATION_NAMES, useVehicleAnimations } from './AnimationController';
import { resolveRuntimeAsset, buildRuntimeNodeIndex, resolveRuntimeMeshNodes } from './vehicleRuntime';

function applyPaintColor(scene, colorHex, paintMaterialNames) {
  if (!scene || !colorHex || !paintMaterialNames?.length) return;
  const targetNames = new Set(paintMaterialNames.map((name) => name.toLowerCase()));
  let color;
  try {
    color = new THREE.Color(colorHex);
  } catch {
    return;
  }
  if (!Number.isFinite(color.r) || !Number.isFinite(color.g) || !Number.isFinite(color.b)) return;
  scene.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (material && targetNames.has((material.name || '').toLowerCase())) {
        material.color.copy(color);
        material.needsUpdate = true;
      }
    });
  });
}

function applyMeshMappings(nodeIndex, selectedIds, mappings) {
  if (!(nodeIndex instanceof Map) || !mappings || typeof mappings !== 'object') return;
  const mappedNames = new Set(Object.values(mappings).flatMap((value) => (
    Array.isArray(value) ? value : [value]
  )).filter((name) => typeof name === 'string' && name.length > 0));
  if (!mappedNames.size) return;

  mappedNames.forEach((name) => {
    const node = nodeIndex.get(name);
    if (node) node.visible = false;
  });

  (selectedIds || []).filter(Boolean).forEach((optionId) => {
    resolveRuntimeMeshNodes(nodeIndex, mappings, optionId).forEach((node) => {
      node.visible = true;
    });
  });
}

function normalizeWheelMappings(wheelMeshNames) {
  return Object.fromEntries(
    Object.entries(wheelMeshNames || {}).map(([optionId, meshName]) => [optionId, [meshName]]),
  );
}

function LoadedVehicle({ asset, runtime, purchasable, interaction }) {
  const { scene, animations } = useGLTF(asset.url);
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
  const runtimeNodeIndex = useMemo(() => buildRuntimeNodeIndex(clonedScene), [clonedScene]);
  const { play, verifiedAnimationMappings } = useVehicleAnimations(animations, groupRef, runtime.interactionAnimationNames);

  useEffect(() => applyPaintColor(clonedScene, asset.paintColorHex, runtime.paintMaterialNames), [asset.paintColorHex, clonedScene, runtime.paintMaterialNames]);
  useEffect(() => {
    applyMeshMappings(runtimeNodeIndex, [purchasable.wheelId], normalizeWheelMappings(runtime.wheelMeshNames));
    applyMeshMappings(runtimeNodeIndex, [purchasable.interiorId, purchasable.roofId, ...(purchasable.accessoryIds || [])], runtime.optionMeshNames);
  }, [purchasable, runtime.optionMeshNames, runtime.wheelMeshNames, runtimeNodeIndex]);

  useEffect(() => {
    const previous = previousInteractionRef.current;
    previousInteractionRef.current = interaction;
    if (!previous) return;
    const supported = new Set(runtime.supportedInteractions);
    const playToggle = (capability, current, before, group, openKey, closeKey, openFallback, closeFallback) => {
      if (!supported.has(capability) || current === before) return;
      const mapping = verifiedAnimationMappings?.[group];
      const requestedKey = current ? openKey : closeKey;
      const fallback = current ? openFallback : closeFallback;
      const animationName = mapping?.[requestedKey] || (mapping ? null : fallback);
      if (animationName) play(animationName);
    };
    playToggle('doors', interaction.doors.frontLeft, previous.doors.frontLeft, 'doors', 'front_left_open', 'front_left_close', ANIMATION_NAMES.DOOR_FL_OPEN, ANIMATION_NAMES.DOOR_FL_CLOSE);
    playToggle('doors', interaction.doors.frontRight, previous.doors.frontRight, 'doors', 'front_right_open', 'front_right_close', ANIMATION_NAMES.DOOR_FR_OPEN, ANIMATION_NAMES.DOOR_FR_CLOSE);
    playToggle('doors', interaction.doors.rearLeft, previous.doors.rearLeft, 'doors', 'rear_left_open', 'rear_left_close', ANIMATION_NAMES.DOOR_RL_OPEN, ANIMATION_NAMES.DOOR_RL_CLOSE);
    playToggle('doors', interaction.doors.rearRight, previous.doors.rearRight, 'doors', 'rear_right_open', 'rear_right_close', ANIMATION_NAMES.DOOR_RR_OPEN, ANIMATION_NAMES.DOOR_RR_CLOSE);
    playToggle('hood', interaction.hoodOpen, previous.hoodOpen, 'hood', 'open', 'close', ANIMATION_NAMES.HOOD_OPEN, ANIMATION_NAMES.HOOD_CLOSE);
    playToggle('boot', interaction.bootOpen, previous.bootOpen, 'boot', 'open', 'close', ANIMATION_NAMES.BOOT_OPEN, ANIMATION_NAMES.BOOT_CLOSE);
    playToggle('frunk', interaction.frunkOpen, previous.frunkOpen, 'frunk', 'open', 'close', ANIMATION_NAMES.FRUNK_OPEN, ANIMATION_NAMES.FRUNK_CLOSE);
    playToggle('sunroof', interaction.sunroofOpen, previous.sunroofOpen, 'sunroof', 'open', 'close', ANIMATION_NAMES.SUNROOF_OPEN, ANIMATION_NAMES.SUNROOF_CLOSE);
  }, [interaction, play, runtime, verifiedAnimationMappings]);

  useEffect(() => () => {
    clonedScene.traverse((node) => {
      if (!node.isMesh) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => material?.dispose());
    });
  }, [clonedScene]);

  return <primitive ref={groupRef} object={clonedScene} />;
}

export default function VehicleModel({ asset, purchasable, interaction }) {
  const runtimeAsset = useMemo(() => resolveRuntimeAsset(asset), [asset]);

  if (!runtimeAsset) {
    console.error('[VehicleModel] Rejected unavailable or invalid verified runtime asset.');
    return null;
  }

  return <LoadedVehicle asset={runtimeAsset} runtime={runtimeAsset} purchasable={purchasable} interaction={interaction} />;
}
