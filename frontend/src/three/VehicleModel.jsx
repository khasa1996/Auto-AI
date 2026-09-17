/**
 * VehicleModel — GLB/GLTF loader with semantic material and animation systems.
 *
 * Visual changes use only mappings declared by the verified asset.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ANIMATION_NAMES, resolveAnimationName, useVehicleAnimations } from './AnimationController';
import { disposeOwnedVehicleMaterials } from './vehicleModelLifecycle';

function applyPaintColor(scene, colorHex, paintMaterialNames) {
  if (!scene || !colorHex || !paintMaterialNames?.length) return;
  const targetNames = new Set(paintMaterialNames.map((name) => name.toLowerCase()));
  const color = new THREE.Color(colorHex);
  scene.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (!material) return;
      if (targetNames.has((material.name || '').toLowerCase())) {
        material.color.copy(color);
        material.needsUpdate = true;
      }
    });
  });
}

function applyMeshMappings(scene, selectedIds, mappings) {
  if (!scene || !mappings || typeof mappings !== 'object') return;
  const selected = new Set((selectedIds || []).filter(Boolean));
  const mappedNames = new Set(Object.values(mappings).flat().filter(Boolean));
  if (!mappedNames.size) return;

  scene.traverse((node) => {
    if (!mappedNames.has(node.name)) return;
    node.visible = false;
  });

  selected.forEach((optionId) => {
    const names = Array.isArray(mappings[optionId]) ? mappings[optionId] : [mappings[optionId]];
    names.filter(Boolean).forEach((name) => {
      scene.traverse((node) => {
        if (node.name === name) node.visible = true;
      });
    });
  });
}

function normalizeWheelMappings(wheelMeshNames) {
  return Object.fromEntries(
    Object.entries(wheelMeshNames || {}).map(([optionId, meshName]) => [optionId, [meshName]]),
  );
}

function LoadedVehicle({ url, paintColorHex, paintMaterialNames, wheelMeshNames, optionMeshNames, interactionAnimationNames, purchasable, interaction, supportedInteractions }) {
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

  useEffect(() => applyPaintColor(clonedScene, paintColorHex, paintMaterialNames), [clonedScene, paintColorHex, paintMaterialNames]);

  useEffect(() => {
    applyMeshMappings(clonedScene, [purchasable.wheelId], normalizeWheelMappings(wheelMeshNames));
    applyMeshMappings(clonedScene, [purchasable.interiorId, purchasable.roofId, ...purchasable.accessoryIds], optionMeshNames);
  }, [clonedScene, purchasable, wheelMeshNames, optionMeshNames]);

  useEffect(() => {
    const previous = previousInteractionRef.current;
    previousInteractionRef.current = interaction;
    if (!previous) return;
    const supported = new Set(Array.isArray(supportedInteractions) ? supportedInteractions : []);
    const playToggle = (capability, current, before, group, openKey, closeKey, openFallback, closeFallback) => {
      if (!supported.has(capability) || current === before) return;
      const key = current ? openKey : closeKey;
      const fallback = current ? openFallback : closeFallback;
      play(resolveAnimationName(interactionAnimationNames, group, key, fallback));
    };
    playToggle('doors', interaction.doors.frontLeft, previous.doors.frontLeft, 'doors', 'front_left_open', 'front_left_close', ANIMATION_NAMES.DOOR_FL_OPEN, ANIMATION_NAMES.DOOR_FL_CLOSE);
    playToggle('doors', interaction.doors.frontRight, previous.doors.frontRight, 'doors', 'front_right_open', 'front_right_close', ANIMATION_NAMES.DOOR_FR_OPEN, ANIMATION_NAMES.DOOR_FR_CLOSE);
    playToggle('doors', interaction.doors.rearLeft, previous.doors.rearLeft, 'doors', 'rear_left_open', 'rear_left_close', ANIMATION_NAMES.DOOR_RL_OPEN, ANIMATION_NAMES.DOOR_RL_CLOSE);
    playToggle('doors', interaction.doors.rearRight, previous.doors.rearRight, 'doors', 'rear_right_open', 'rear_right_close', ANIMATION_NAMES.DOOR_RR_OPEN, ANIMATION_NAMES.DOOR_RR_CLOSE);
    playToggle('hood', interaction.hoodOpen, previous.hoodOpen, 'hood', 'open', 'close', ANIMATION_NAMES.HOOD_OPEN, ANIMATION_NAMES.HOOD_CLOSE);
    playToggle('boot', interaction.bootOpen, previous.bootOpen, 'boot', 'open', 'close', ANIMATION_NAMES.BOOT_OPEN, ANIMATION_NAMES.BOOT_CLOSE);
    playToggle('frunk', interaction.frunkOpen, previous.frunkOpen, 'frunk', 'open', 'close', ANIMATION_NAMES.FRUNK_OPEN, ANIMATION_NAMES.FRUNK_CLOSE);
    playToggle('sunroof', interaction.sunroofOpen, previous.sunroofOpen, 'sunroof', 'open', 'close', ANIMATION_NAMES.SUNROOF_OPEN, ANIMATION_NAMES.SUNROOF_CLOSE);
  }, [interaction, play, supportedInteractions, interactionAnimationNames]);

  useEffect(() => () => disposeOwnedVehicleMaterials(clonedScene), [clonedScene]);

  return <primitive ref={groupRef} object={clonedScene} />;
}

export default function VehicleModel({ url, paintColorHex, paintMaterialNames = [], wheelMeshNames = {}, optionMeshNames = {}, interactionAnimationNames = {}, purchasable, interaction, supportedInteractions = [] }) {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (!lower.endsWith('.glb') && !lower.endsWith('.gltf')) {
    console.error('[VehicleModel] Rejected non-GLB/GLTF URL.', url);
    return null;
  }
  return <LoadedVehicle url={url} paintColorHex={paintColorHex} paintMaterialNames={paintMaterialNames} wheelMeshNames={wheelMeshNames} optionMeshNames={optionMeshNames} interactionAnimationNames={interactionAnimationNames} purchasable={purchasable} interaction={interaction} supportedInteractions={supportedInteractions} />;
}
