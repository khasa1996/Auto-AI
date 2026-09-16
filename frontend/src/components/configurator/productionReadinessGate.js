const BLOCKER_FALLBACK = 'production readiness could not be verified';

export function evaluateProductionReadiness(payload) {
  const blockers = Array.isArray(payload?.blockers)
    ? payload.blockers.filter((item) => typeof item === 'string' && item.trim())
    : [];
  const warnings = Array.isArray(payload?.warnings)
    ? payload.warnings.filter((item) => typeof item === 'string' && item.trim())
    : [];

  if (!payload || typeof payload !== 'object') {
    return {
      ready: false,
      status: 'COMING_SOON',
      blockers: [BLOCKER_FALLBACK],
      warnings: [],
    };
  }

  const ready = payload.ready === true && blockers.length === 0;
  return {
    ready,
    status: ready ? 'READY' : 'COMING_SOON',
    blockers: ready ? [] : (blockers.length ? blockers : [BLOCKER_FALLBACK]),
    warnings,
  };
}
