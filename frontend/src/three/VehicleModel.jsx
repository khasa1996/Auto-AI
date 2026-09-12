/**
 * VehicleModel — GLB/GLTF loader with semantic material and animation systems.
 *
 * Visual changes use only mappings declared by the verified asset.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ANIMATION_NAMES, resolveAnimationName, useVehicleAnimations } from './AnimationController';

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
    const playToggle = (capability, current, before, group, key, fallback) => {
      if (!supported.has(capability) || current === before) return;
      play(resolveAnimationName(interactionAnimationNames, group, key, fallback));
    };
    playToggle('doors', interaction.doors.frontLeft, previous.doors.frontLeft, 'doors', 'front_left_open', ANIMATION_NAMES.DOOR_FL_OPEN);
    playToggle('doors', interaction.doors.frontRight, previous.doors.frontRight, 'doors', 'front_right_open', ANIMATION_NAMES.DOOR_FR_OPEN);
    playToggle('doors', interaction.doors.rearLeft, previous.doors.rearLeft, 'doors', 'rear_left_open', ANIMATION_NAMES.DOOR_RL_OPEN);
    playToggle('doors', interaction.doors.rearRight, previous.doors.rearRight, 'doors', 'rear_right_open', ANIMATION_NAMES.DOOR_RR_OPEN);
    playToggle('hood', interaction.hoodOpen, previous.hoodOpen, 'hood', 'open', ANIMATION_NAMES.HOOD_OPEN);
    playToggle('boot', interaction.bootOpen, previous.bootOpen, 'boot', 'open', ANIMATION_NAMES.BOOT_OPEN);
    playToggle('frunk', interaction.frunkOpen, previous.frunkOpen, 'frunk', 'open', ANIMATION_NAMES.FRUNK_OPEN);
    playToggle('sunroof', interaction.sunroofOpen, previous.sunroofOpen, 'sunroof', 'open', ANIMATION_NAMES.SUNROOF_OPEN);
    playToggle('doors', interaction.doors.frontLeft, previous.doors.frontLeft, 'doors', 'front_left_close', ANIMATION_NAMES.DOOR_FL_CLOSE);
  }, [interaction, play, supportedInteractions, interactionAnimationNames]);

  useEffect(() => () => {
    clonedScene.traverse((node) => {
      if (!node.isMesh) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => material?.dispose());
    });
  }, [clonedScene]);

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
