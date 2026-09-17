/**
 * configuratorStore — single authoritative state for the 3D configurator.
 *
 * Purchasable configuration is separate from showroom interaction state.
 * Pricing and validation are always backend-authoritative.
 */

import { create } from 'zustand';
import { getVerifiedRuntimeCapabilities, getVerifiedMappings, isRuntimeAssetUsable } from '../components/configurator/assetRuntimeCapabilities';

const defaultPurchasable = {
  variantId: null,
  paintId: null,
  wheelId: null,
  interiorId: null,
  roofId: null,
  accessoryIds: [],
};

const defaultDoors = { frontLeft: false, frontRight: false, rearLeft: false, rearRight: false };
const defaultLighting = {
  headlights: false,
  drl: false,
  taillights: false,
  fog_lights: false,
  left_indicator: false,
  right_indicator: false,
  hazard: false,
  interior: false,
};

const defaultInteraction = {
  doors: { ...defaultDoors },
  hoodOpen: false,
  bootOpen: false,
  frunkOpen: false,
  sunroofOpen: false,
  lighting: { ...defaultLighting },
  cameraPreset: 'exterior',
  autoRotate: false,
};

const defaultAsset = {
  available: false,
  url: null,
  format: null,
  version: null,
  lodLevel: null,
  supportedInteractions: [],
  paintMaterialNames: [],
  interiorMaterialNames: [],
  wheelMeshNames: {},
  optionMeshNames: {},
  interactionAnimationNames: {},
  cameraPresetNames: [],
  configuratorStatus: 'COMING_SOON',
  loadedAt: null,
};

const defaultRuntimeOptions = {
  variant_id: null,
  colors: [],
  wheels: [],
  interiors: [],
  roofs: [],
  accessories: [],
};

const defaultPrice = { loading: false, error: null, data: null, lastFetchedFor: null };
const defaultValidation = { loading: false, error: null, result: null };
const defaultShowroom = { active: false, paused: true };

const CAMERA_CAPABILITIES = {
  exterior: ['camera_exterior'],
  front: ['camera_exterior'],
  rear: ['camera_exterior'],
  left: ['camera_exterior'],
  right: ['camera_exterior'],
  top: ['camera_exterior'],
  wheel: ['camera_exterior'],
  boot: ['camera_exterior', 'boot'],
  interior: ['camera_interior'],
  cockpit: ['camera_interior'],
};

export function isCameraPresetSupported(supportedInteractions, preset) {
  if (!Array.isArray(supportedInteractions)) return false;
  const required = CAMERA_CAPABILITIES[preset];
  if (!required) return false;
  return required.every((capability) => supportedInteractions.includes(capability));
}

function normalizeAssetManifest(assetData = {}) {
  return {
    ...assetData,
    lodLevel: assetData.lodLevel ?? assetData.lod_level,
    configuratorStatus: assetData.configuratorStatus ?? assetData.configurator_status,
    supportedInteractions: assetData.supportedInteractions ?? assetData.supported_interactions,
    paintMaterialNames: assetData.paintMaterialNames ?? assetData.paint_material_names,
    interiorMaterialNames: assetData.interiorMaterialNames ?? assetData.interior_material_names,
    interiorMaterialMappings: assetData.interiorMaterialMappings ?? assetData.interior_material_mappings,
    wheelMeshNames: assetData.wheelMeshNames ?? assetData.wheel_mesh_names,
    optionMeshNames: assetData.optionMeshNames ?? assetData.option_mesh_names,
    cameraPresetNames: assetData.cameraPresetNames ?? assetData.camera_preset_names,
    interactionAnimationNames: assetData.interactionAnimationNames ?? assetData.interaction_animation_names,
  };
}

function normalizeRuntimeOptions(options = {}, variantId = null) {
  return {
    variant_id: options.variant_id ?? variantId,
    colors: Array.isArray(options.colors) ? options.colors : [],
    wheels: Array.isArray(options.wheels) ? options.wheels : [],
    interiors: Array.isArray(options.interiors) ? options.interiors : [],
    roofs: Array.isArray(options.roofs) ? options.roofs : [],
    accessories: Array.isArray(options.accessories) ? options.accessories : [],
  };
}

function runtimeContractToAsset(contract = {}) {
  const asset = contract.asset || {};
  const capabilities = contract.capabilities || {};
  return {
    ...asset,
    available: contract.ready === true,
    supportedInteractions: capabilities.interactions || [],
    paintMaterialNames: capabilities.paint_materials || [],
    interiorMaterialNames: capabilities.interior_materials || [],
    interiorMaterialMappings: capabilities.interior_material_mappings || {},
    wheelMeshNames: capabilities.wheel_mesh_mappings || {},
    optionMeshNames: capabilities.option_mesh_mappings || {},
    cameraPresetNames: capabilities.cameras || [],
    interactionAnimationNames: capabilities.animations || {},
    configuratorStatus: contract.ready === true ? 'AVAILABLE' : 'COMING_SOON',
  };
}

export const useConfiguratorStore = create((set, get) => ({
  purchasable: { ...defaultPurchasable },
  interaction: { ...defaultInteraction },
  asset: { ...defaultAsset },
  runtimeOptions: { ...defaultRuntimeOptions },
  price: { ...defaultPrice },
  validation: { ...defaultValidation },
  showroom: { ...defaultShowroom },
  city: null,
  isInitialized: false,

  setVariant(variantId) {
    set({
      purchasable: { ...defaultPurchasable, variantId },
      interaction: { ...defaultInteraction },
      asset: { ...defaultAsset },
      runtimeOptions: { ...defaultRuntimeOptions, variant_id: variantId },
      price: { ...defaultPrice },
      validation: { ...defaultValidation },
      showroom: { ...defaultShowroom },
      city: null,
      isInitialized: true,
    });
  },
  setPaint(paintId) { set((s) => ({ purchasable: { ...s.purchasable, paintId } })); },
  setWheels(wheelId) { set((s) => ({ purchasable: { ...s.purchasable, wheelId } })); },
  setInterior(interiorId) { set((s) => ({ purchasable: { ...s.purchasable, interiorId } })); },
  setRoof(roofId) { set((s) => ({ purchasable: { ...s.purchasable, roofId } })); },
  toggleAccessory(accessoryId) {
    set((s) => {
      const current = s.purchasable.accessoryIds;
      const next = current.includes(accessoryId)
        ? current.filter((id) => id !== accessoryId)
        : [...current, accessoryId];
      return { purchasable: { ...s.purchasable, accessoryIds: next } };
    });
  },
  toggleDoor(side) {
    set((s) => ({ interaction: { ...s.interaction, doors: { ...s.interaction.doors, [side]: !s.interaction.doors[side] } } }));
  },
  toggleHood() { set((s) => ({ interaction: { ...s.interaction, hoodOpen: !s.interaction.hoodOpen } })); },
  toggleBoot() { set((s) => ({ interaction: { ...s.interaction, bootOpen: !s.interaction.bootOpen } })); },
  toggleFrunk() { set((s) => ({ interaction: { ...s.interaction, frunkOpen: !s.interaction.frunkOpen } })); },
  toggleSunroof() { set((s) => ({ interaction: { ...s.interaction, sunroofOpen: !s.interaction.sunroofOpen } })); },
  toggleLight(lightKey) {
    set((s) => ({ interaction: { ...s.interaction, lighting: { ...s.interaction.lighting, [lightKey]: !s.interaction.lighting[lightKey] } } }));
  },
  toggleHazard() {
    set((s) => {
      const nextHazard = !s.interaction.lighting.hazard;
      return { interaction: { ...s.interaction, lighting: { ...s.interaction.lighting, hazard: nextHazard, left_indicator: nextHazard ? false : s.interaction.lighting.left_indicator, right_indicator: nextHazard ? false : s.interaction.lighting.right_indicator } } };
    });
  },
  setCameraPreset(preset, { pauseShowroom = true } = {}) {
    set((s) => {
      if (!isCameraPresetSupported(s.asset.supportedInteractions, preset)) return s;
      return {
        interaction: { ...s.interaction, cameraPreset: preset },
        showroom: pauseShowroom ? { ...s.showroom, paused: true } : s.showroom,
      };
    });
  },
  setAutoRotate(value) { set((s) => ({ interaction: { ...s.interaction, autoRotate: value } })); },
  pauseAutoRotate() { set((s) => ({ interaction: { ...s.interaction, autoRotate: false } })); },
  setShowroomActive(active) {
    set((s) => ({ showroom: { ...s.showroom, active, paused: !active } }));
  },
  setShowroomPaused(paused) {
    set((s) => ({ showroom: { ...s.showroom, paused } }));
  },
  setAsset(assetData) {
    const normalizedAsset = normalizeAssetManifest(assetData);
    const capabilities = getVerifiedRuntimeCapabilities(normalizedAsset);
    const mappings = getVerifiedMappings(normalizedAsset);
    const usable = isRuntimeAssetUsable(normalizedAsset);
    set({
      asset: {
        ...defaultAsset,
        ...normalizedAsset,
        ...capabilities,
        ...mappings,
        available: usable,
        configuratorStatus: usable ? normalizedAsset.configuratorStatus : 'UNAVAILABLE',
        loadedAt: new Date().toISOString(),
      },
    });
  },
  setRuntimeContract(contract) {
    const normalizedAsset = normalizeAssetManifest(runtimeContractToAsset(contract));
    const capabilities = getVerifiedRuntimeCapabilities(normalizedAsset);
    const mappings = getVerifiedMappings(normalizedAsset);
    const usable = contract?.ready === true && isRuntimeAssetUsable(normalizedAsset);
    const variantId = typeof contract?.variant_id === 'string' ? contract.variant_id : null;
    set({
      asset: {
        ...defaultAsset,
        ...normalizedAsset,
        ...capabilities,
        ...mappings,
        available: usable,
        configuratorStatus: usable ? 'AVAILABLE' : 'COMING_SOON',
        loadedAt: new Date().toISOString(),
      },
      runtimeOptions: normalizeRuntimeOptions(contract?.options, variantId),
    });
  },
  setAssetUnavailable(status = 'COMING_SOON') {
    set({ asset: { ...defaultAsset, configuratorStatus: status } });
  },
  setPriceLoading() { set({ price: { ...get().price, loading: true, error: null } }); },
  setPriceResult(data) { set({ price: { loading: false, error: null, data, lastFetchedFor: JSON.stringify(get().purchasable) } }); },
  setPriceError(error) { set({ price: { ...get().price, loading: false, error } }); },
  setValidationLoading() { set({ validation: { loading: true, error: null, result: null } }); },
  setValidationResult(result) { set({ validation: { loading: false, error: null, result } }); },
  setValidationError(error) { set({ validation: { loading: false, error, result: null } }); },
  setCity(city) { set({ city }); },
  reset() {
    set({ purchasable: { ...defaultPurchasable }, interaction: { ...defaultInteraction }, asset: { ...defaultAsset }, runtimeOptions: { ...defaultRuntimeOptions }, price: { ...defaultPrice }, validation: { ...defaultValidation }, showroom: { ...defaultShowroom }, city: null, isInitialized: false });
  },
}));
