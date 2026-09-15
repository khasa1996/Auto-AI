import { describe, expect, it } from 'vitest';

import { evaluateProductionReadiness } from './productionReadinessGate';

describe('evaluateProductionReadiness', () => {
  it('allows the public 3D configurator only when backend readiness is true', () => {
    expect(evaluateProductionReadiness({ ready: true, blockers: [], warnings: [] })).toEqual({
      ready: true,
      status: 'READY',
      blockers: [],
      warnings: [],
    });
  });

  it('blocks publication when the backend reports blockers', () => {
    expect(evaluateProductionReadiness({
      ready: false,
      blockers: ['3D asset is not published'],
      warnings: [],
    })).toEqual({
      ready: false,
      status: 'COMING_SOON',
      blockers: ['3D asset is not published'],
      warnings: [],
    });
  });

  it('fails closed for a missing or malformed readiness response', () => {
    expect(evaluateProductionReadiness(null)).toEqual({
      ready: false,
      status: 'COMING_SOON',
      blockers: ['production readiness could not be verified'],
      warnings: [],
    });
  });

  it('fails closed when ready is true but blockers are present', () => {
    expect(evaluateProductionReadiness({ ready: true, blockers: ['unverified pricing'] })).toEqual({
      ready: false,
      status: 'COMING_SOON',
      blockers: ['unverified pricing'],
      warnings: [],
    });
  });
});
