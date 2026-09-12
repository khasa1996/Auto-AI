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
  city: null,
  isInitialized: false,

  setVariant(variantId) {
    set({
      purchasable: { ...defaultPurchasable, variantId },
      interaction: { ...defaultInteraction },
      asset: { ...defaultAsset },
      price: { ...defaultPrice },
      validation: { ...defaultValidation },
      city: null,
      isInitialized: true,
    });
  },
  setPaint(paintId) { set((s) => ({ purchasable: { ...s.purchasable, paintId } })); },
  setWheels(wheelId) { set((s) => ({ purchasable: { ...s.purchasable, wheelId } })); },
  setInterior(interiorId) { set((s) => ({ purchasable: { ...s.purchasable, interiorId } })); },
  setRoof(roofId) { set((s) => ({ purchasable: { ...s.purchasable, roofId } })); },
  setAccessories(accessoryIds) { set((s) => ({ purchasable: { ...s.purchasable, accessoryIds: [...accessoryIds] } })); },
  setAsset(asset) { set({ asset: { ...defaultAsset, ...asset } }); },
  setPrice(data) { set({ price: { loading: false, error: null, data, lastFetchedFor: null } }); },
  setPriceLoading(loading) { set((s) => ({ price: { ...s.price, loading } })); },
  setPriceError(error) { set((s) => ({ price: { ...s.price, loading: false, error } })); },
  setValidationLoading(loading) { set((s) => ({ validation: { ...s.validation, loading } })); },
  setValidationResult(result) { set({ validation: { loading: false, error: null, result } }); },
  setValidationError(error) { set((s) => ({ validation: { ...s.validation, loading: false, error } })); },
  setCity(city) { set({ city }); },
  setCameraPreset(preset) {
    const { asset } = get();
    if (!isCameraPresetSupported(asset.supportedInteractions, preset)) return;
    set((s) => ({ interaction: { ...s.interaction, cameraPreset: preset } }));
  },
  toggleAutoRotate() { set((s) => ({ interaction: { ...s.interaction, autoRotate: !s.interaction.autoRotate } })); },
  pauseAutoRotate() { set((s) => ({ interaction: { ...s.interaction, autoRotate: false } })); },
  setDoor(side, open) { set((s) => ({ interaction: { ...s.interaction, doors: { ...s.interaction.doors, [side]: Boolean(open) } } })); },
  setHoodOpen(open) { set((s) => ({ interaction: { ...s.interaction, hoodOpen: Boolean(open) } })); },
  setBootOpen(open) { set((s) => ({ interaction: { ...s.interaction, bootOpen: Boolean(open) } })); },
  setFrunkOpen(open) { set((s) => ({ interaction: { ...s.interaction, frunkOpen: Boolean(open) } })); },
  setSunroofOpen(open) { set((s) => ({ interaction: { ...s.interaction, sunroofOpen: Boolean(open) } })); },
  setLighting(key, value) { set((s) => ({ interaction: { ...s.interaction, lighting: { ...s.interaction.lighting, [key]: Boolean(value) } } })); },
  reset() {
    set({
      purchasable: { ...defaultPurchasable },
      interaction: { ...defaultInteraction },
      asset: { ...defaultAsset },
      price: { ...defaultPrice },
      validation: { ...defaultValidation },
      city: null,
      isInitialized: false,
    });
  },
}));
