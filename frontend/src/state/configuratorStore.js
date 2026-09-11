/**
 * configuratorStore — single authoritative state for the 3D configurator.
 *
 * Design rules:
 *  - ONE store. No local component copies of configuration.
 *  - Purchasable config (affects price) is SEPARATE from interaction state.
 *  - Price is ALWAYS fetched from the backend after a purchasable change.
 *    The store never computes price itself.
 *  - Interaction state (doors, lights, camera) never triggers a price fetch.
 *
 * State shape mirrors the backend ConfigurationState schema exactly.
 */

import { create } from 'zustand';

// ── Default states ──────────────────────────────────────────────────────

const defaultPurchasable = {
  variantId:    null,
  paintId:      null,
  wheelId:      null,
  interiorId:   null,
  roofId:       null,
  accessoryIds: [],
};

const defaultDoors = {
  frontLeft:  false,
  frontRight: false,
  rearLeft:   false,
  rearRight:  false,
};

const defaultLighting = {
  headlights:     false,
  drl:            false,
  taillights:     false,
  fog_lights:     false,
  left_indicator: false,
  right_indicator:false,
  hazard:         false,
  interior:       false,
};

const defaultInteraction = {
  doors:        { ...defaultDoors },
  hoodOpen:     false,
  bootOpen:     false,
  frunkOpen:    false,
  sunroofOpen:  false,
  lighting:     { ...defaultLighting },
  cameraPreset: 'exterior',
  autoRotate:   false,
};

// ── Asset metadata (loaded from backend, not invented) ───────────────────

const defaultAsset = {
  available:          false,
  url:                null,
  format:             null,
  version:            null,
  lodLevel:           null,
  supportedInteractions: [],
  paintMaterialNames: [],
  wheelMeshNames:     {},
  configuratorStatus: 'COMING_SOON',
  loadedAt:           null,
};

// ── Price state (always from backend) ────────────────────────────────────

const defaultPrice = {
  loading:         false,
  error:           null,
  data:            null,   // ConfigurationPriceResponse from backend
  lastFetchedFor:  null,   // snapshot of purchasable config at last fetch
};

// ── Validation state ─────────────────────────────────────────────────────

const defaultValidation = {
  loading: false,
  error:   null,
  result:  null,  // ValidationResult from backend
};

// ── Store ─────────────────────────────────────────────────────────────────

export const useConfiguratorStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────
  purchasable:  { ...defaultPurchasable },
  interaction:  { ...defaultInteraction },
  asset:        { ...defaultAsset },
  price:        { ...defaultPrice },
  validation:   { ...defaultValidation },
  city:         null,
  isInitialized: false,

  // ── Purchasable configuration actions ──────────────────────────────────

  setVariant(variantId) {
    set({
      purchasable: { ...defaultPurchasable, variantId },
      interaction: { ...defaultInteraction },
      asset:       { ...defaultAsset },
      price:       { ...defaultPrice },
      validation:  { ...defaultValidation },
      isInitialized: true,
    });
  },

  setPaint(paintId) {
    set((s) => ({ purchasable: { ...s.purchasable, paintId } }));
  },

  setWheels(wheelId) {
    set((s) => ({ purchasable: { ...s.purchasable, wheelId } }));
  },

  setInterior(interiorId) {
    set((s) => ({ purchasable: { ...s.purchasable, interiorId } }));
  },

  setRoof(roofId) {
    set((s) => ({ purchasable: { ...s.purchasable, roofId } }));
  },

  toggleAccessory(accessoryId) {
    set((s) => {
      const current = s.purchasable.accessoryIds;
      const next = current.includes(accessoryId)
        ? current.filter((id) => id !== accessoryId)
        : [...current, accessoryId];
      return { purchasable: { ...s.purchasable, accessoryIds: next } };
    });
  },

  // ── Interaction actions (do NOT trigger price fetch) ───────────────────

  toggleDoor(side) {
    // side: 'frontLeft' | 'frontRight' | 'rearLeft' | 'rearRight'
    set((s) => ({
      interaction: {
        ...s.interaction,
        doors: {
          ...s.interaction.doors,
          [side]: !s.interaction.doors[side],
        },
      },
    }));
  },

  toggleHood() {
    set((s) => ({
      interaction: { ...s.interaction, hoodOpen: !s.interaction.hoodOpen },
    }));
  },

  toggleBoot() {
    set((s) => ({
      interaction: { ...s.interaction, bootOpen: !s.interaction.bootOpen },
    }));
  },

  toggleFrunk() {
    set((s) => ({
      interaction: { ...s.interaction, frunkOpen: !s.interaction.frunkOpen },
    }));
  },

  toggleSunroof() {
    set((s) => ({
      interaction: { ...s.interaction, sunroofOpen: !s.interaction.sunroofOpen },
    }));
  },

  toggleLight(lightKey) {
    // lightKey: one of the keys in defaultLighting
    set((s) => ({
      interaction: {
        ...s.interaction,
        lighting: {
          ...s.interaction.lighting,
          [lightKey]: !s.interaction.lighting[lightKey],
        },
      },
    }));
  },

  toggleHazard() {
    set((s) => {
      const nextHazard = !s.interaction.lighting.hazard;
      return {
        interaction: {
          ...s.interaction,
          lighting: {
            ...s.interaction.lighting,
            hazard:          nextHazard,
            left_indicator:  nextHazard ? false : s.interaction.lighting.left_indicator,
            right_indicator: nextHazard ? false : s.interaction.lighting.right_indicator,
          },
        },
      };
    });
  },

  setCameraPreset(preset) {
    set((s) => ({
      interaction: { ...s.interaction, cameraPreset: preset },
    }));
  },

  setAutoRotate(value) {
    set((s) => ({
      interaction: { ...s.interaction, autoRotate: value },
    }));
  },

  pauseAutoRotate() {
    set((s) => ({
      interaction: { ...s.interaction, autoRotate: false },
    }));
  },

  // ── Asset metadata (set by configurator page after backend fetch) ───────

  setAsset(assetData) {
    set({
      asset: {
        ...defaultAsset,
        ...assetData,
        loadedAt: new Date().toISOString(),
      },
    });
  },

  setAssetUnavailable(status = 'COMING_SOON') {
    set({ asset: { ...defaultAsset, configuratorStatus: status } });
  },

  // ── Price (always from backend) ────────────────────────────────────────

  setPriceLoading() {
    set({ price: { ...get().price, loading: true, error: null } });
  },

  setPriceResult(data) {
    set({
      price: {
        loading: false,
        error: null,
        data,
        lastFetchedFor: JSON.stringify(get().purchasable),
      },
    });
  },

  setPriceError(error) {
    set({ price: { ...get().price, loading: false, error } });
  },

  // ── Validation ──────────────────────────────────────────────────────────

  setValidationLoading() {
    set({ validation: { loading: true, error: null, result: null } });
  },

  setValidationResult(result) {
    set({ validation: { loading: false, error: null, result } });
  },

  setValidationError(error) {
    set({ validation: { loading: false, error, result: null } });
  },

  // ── City ───────────────────────────────────────────────────────────────

  setCity(city) {
    set({ city });
  },

  // ── Reset ──────────────────────────────────────────────────────────────

  reset() {
    set({
      purchasable:   { ...defaultPurchasable },
      interaction:   { ...defaultInteraction },
      asset:         { ...defaultAsset },
      price:         { ...defaultPrice },
      validation:    { ...defaultValidation },
      isInitialized: false,
    });
  },
}));
