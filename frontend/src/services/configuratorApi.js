/**
 * configuratorApi — backend contract for configurator workflows.
 */

import { api } from "../lib/api";

const V1 = "/v1";
const READINESS_BLOCKER = 'production readiness could not be verified';

export function gateAssetResponse(assetResponse, readiness) {
  const blockers = Array.isArray(readiness?.blockers)
    ? readiness.blockers.filter((item) => typeof item === 'string' && item.trim())
    : [];
  if (readiness?.ready === true && blockers.length === 0) return assetResponse;
  return {
    available: false,
    asset: null,
    status: 'COMING_SOON',
    readiness_blockers: blockers.length ? blockers : [READINESS_BLOCKER],
  };
}

export function syncConfiguratorShareUrl(shareToken) {
  if (!shareToken || typeof window === 'undefined' || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  url.searchParams.set('config', shareToken);
  window.history.replaceState({}, '', url.toString());
}

export const configuratorApi = {
  getBrands: (activeOnly = true) => api.get(`${V1}/brands`, { params: { active_only: activeOnly } }),
  getModels: (params = {}) => api.get(`${V1}/models`, { params }),
  getModel: (modelId) => api.get(`${V1}/models/${modelId}`),
  getVariants: (params = {}) => api.get(`${V1}/variants`, { params }),
  getVariant: (variantId) => api.get(`${V1}/variants/${variantId}`),
  getAvailability: (variantId) => api.get(`${V1}/configurator/${variantId}/availability`),
  getReadiness: (variantId) => api.get(`${V1}/configurator/variants/${variantId}/readiness`),
  getAsset: async (variantId) => {
    const assetResponse = await api.get(`${V1}/configurator/${variantId}/asset`);
    try {
      const readinessResponse = await api.get(`${V1}/configurator/variants/${variantId}/readiness`);
      return { ...assetResponse, data: gateAssetResponse(assetResponse.data, readinessResponse.data) };
    } catch {
      return { ...assetResponse, data: gateAssetResponse(assetResponse.data, null) };
    }
  },
  getHotspots: (variantId) => api.get(`${V1}/configurator/${variantId}/hotspots`),
  getOptions: (variantId) => api.get(`${V1}/configurator/${variantId}/options`),
  getRules: (variantId) => api.get(`${V1}/configurator/${variantId}/rules`),
  getPricingLocations: (variantId) => api.get(`${V1}/configurator/${variantId}/pricing-locations`),
  validateConfiguration: (configuration) => api.post(`${V1}/configurator/validate`, { configuration }),
  calculatePrice: (configuration, city = null) => api.post(`${V1}/configurator/price`, { configuration, city }),
  resolveWithAI: (intent) => api.post(`${V1}/configurator/ai`, intent),
  recommendVariants: (request) => api.post(`${V1}/configurator/recommendations`, request),
  calculateEMI: (payload) => api.post('/emi/calculate', payload),
  saveConfiguration: async (payload) => {
    const response = await api.post(`${V1}/configurator/configurations`, payload);
    syncConfiguratorShareUrl(response.data?.share_token);
    return response;
  },
  loadConfiguration: (configIdOrToken) => api.get(`${V1}/configurator/configurations/${configIdOrToken}`),
  getHistory: (limit = 20) => api.get(`${V1}/configurator/history`, { params: { limit } }),
  compareConfigurations: (left, right) => api.post(`${V1}/configurator/compare`, { left, right }),
  createConversionLead: (payload) => api.post(`${V1}/configurator/conversion-lead`, payload),
  createConversionHandoff: (payload, intent) => api.post(`${V1}/configurator/conversion-handoff`, { ...payload, intent }),
  validateAssetUrl: (url) => api.post(`${V1}/configurator/assets/validate-url`, { url }),
};
