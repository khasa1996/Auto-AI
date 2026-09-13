/**
 * configuratorStore — single authoritative state for the 3D configurator.
 *
 * Purchasable configuration is separate from showroom interaction state.
 * Pricing and validation are always backend-authoritative.
 */

import { create } from 'zustand';

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
  wheelMeshNames: {},
  optionMeshNames: {},
  interactionAnimationNames: {},
  configuratorStatus: 'COMING_SOON',
  loadedAt: null,
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

export const useConfiguratorStore = create((set, get) => ({
  purchasable: { ...defaultPurchasable },
  interaction: { ...defaultInteraction },
  asset: { ...defaultAsset },
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
  setCameraPreset(preset) {
    set((s) => {
      if (!isCameraPresetSupported(s.asset.supportedInteractions, preset)) return s;
      return {
        interaction: { ...s.interaction, cameraPreset: preset },
        showroom: { ...s.showroom, paused: true },
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
  setAsset(assetData) { set({ asset: { ...defaultAsset, ...assetData, loadedAt: new Date().toISOString() } }); },
  setAssetUnavailable(status = 'COMING_SOON') { set({ asset: { ...defaultAsset, configuratorStatus: status } }); },
  setPriceLoading() { set({ price: { ...get().price, loading: true, error: null } }); },
  setPriceResult(data) { set({ price: { loading: false, error: null, data, lastFetchedFor: JSON.stringify(get().purchasable) } }); },
  setPriceError(error) { set({ price: { ...get().price, loading: false, error } }); },
  setValidationLoading() { set({ validation: { loading: true, error: null, result: null } }); },
  setValidationResult(result) { set({ validation: { loading: false, error: null, result } }); },
  setValidationError(error) { set({ validation: { loading: false, error, result: null } }); },
  setCity(city) { set({ city }); },
  reset() {
    set({ purchasable: { ...defaultPurchasable }, interaction: { ...defaultInteraction }, asset: { ...defaultAsset }, price: { ...defaultPrice }, validation: { ...defaultValidation }, showroom: { ...defaultShowroom }, city: null, isInitialized: false });
  },
}));
