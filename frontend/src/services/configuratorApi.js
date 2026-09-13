/**
 * configuratorApi — backend contract for configurator workflows.
 */

import { api } from "../lib/api";

const V1 = "/v1";

export const configuratorApi = {
  getBrands: (activeOnly = true) => api.get(`${V1}/brands`, { params: { active_only: activeOnly } }),
  getModels: (params = {}) => api.get(`${V1}/models`, { params }),
  getModel: (modelId) => api.get(`${V1}/models/${modelId}`),
  getVariants: (params = {}) => api.get(`${V1}/variants`, { params }),
  getVariant: (variantId) => api.get(`${V1}/variants/${variantId}`),
  getAvailability: (variantId) => api.get(`${V1}/configurator/${variantId}/availability`),
  getAsset: (variantId) => api.get(`${V1}/configurator/${variantId}/asset`),
  getHotspots: (variantId) => api.get(`${V1}/configurator/${variantId}/hotspots`),
  getOptions: (variantId) => api.get(`${V1}/configurator/${variantId}/options`),
  getRules: (variantId) => api.get(`${V1}/configurator/${variantId}/rules`),
  getPricingLocations: (variantId) => api.get(`${V1}/configurator/${variantId}/pricing-locations`),
  validateConfiguration: (configuration) => api.post(`${V1}/configurator/validate`, { configuration }),
  calculatePrice: (configuration, city = null) => api.post(`${V1}/configurator/price`, { configuration, city }),
  resolveWithAI: (intent) => api.post(`${V1}/configurator/ai`, intent),
  saveConfiguration: (payload) => api.post(`${V1}/configurator/configurations`, payload),
  loadConfiguration: (configIdOrToken) => api.get(`${V1}/configurator/configurations/${configIdOrToken}`),
  getHistory: (limit = 20) => api.get(`${V1}/configurator/history`, { params: { limit } }),
  compareConfigurations: (left, right) => api.post(`${V1}/configurator/compare`, { left, right }),
  createConversionLead: (payload) => api.post(`${V1}/configurator/conversion-lead`, payload),
  createConversionHandoff: (payload, intent) => api.post(`${V1}/configurator/conversion-handoff`, { ...payload, intent }),
  validateAssetUrl: (url) => api.post(`${V1}/configurator/assets/validate-url`, { url }),
};
