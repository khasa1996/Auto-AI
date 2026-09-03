/**
 * configuratorApi — all API calls for the Phase 2 configurator.
 *
 * All pricing, validation, and asset data comes from the backend.
 * This layer never invents data.
 */

import { api } from './api';

const V1 = '/v1';

export const configuratorApi = {
  // Brands
  getBrands: (activeOnly = true) =>
    api.get(`${V1}/brands`, { params: { active_only: activeOnly } }),

  // Models
  getModels: (params = {}) =>
    api.get(`${V1}/models`, { params }),

  getModel: (modelId) =>
    api.get(`${V1}/models/${modelId}`),

  // Variants
  getVariants: (params = {}) =>
    api.get(`${V1}/variants`, { params }),

  getVariant: (variantId) =>
    api.get(`${V1}/variants/${variantId}`),

  // Configurator
  getAvailability: (variantId) =>
    api.get(`${V1}/configurator/${variantId}/availability`),

  getAsset: (variantId) =>
    api.get(`${V1}/configurator/${variantId}/asset`),

  getOptions: (variantId) =>
    api.get(`${V1}/configurator/${variantId}/options`),

  getRules: (variantId) =>
    api.get(`${V1}/configurator/${variantId}/rules`),

  validateConfiguration: (configuration) =>
    api.post(`${V1}/configurator/validate`, { configuration }),

  calculatePrice: (configuration, city = null) =>
    api.post(`${V1}/configurator/price`, {
      configuration,
      city,
    }),

  saveConfiguration: (payload) =>
    api.post(`${V1}/configurator/configurations`, payload),

  loadConfiguration: (configIdOrToken) =>
    api.get(`${V1}/configurator/configurations/${configIdOrToken}`),

  validateAssetUrl: (url) =>
    api.post(`${V1}/configurator/assets/validate-url`, { url }),
};
