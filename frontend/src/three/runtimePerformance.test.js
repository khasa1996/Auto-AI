import { getConfiguratorDpr } from './runtimePerformance';

test('caps configurator DPR for constrained mobile devices', () => {
  expect(getConfiguratorDpr({ deviceMemory: 2, hardwareConcurrency: 4 })).toEqual([1, 1.25]);
});

test('allows higher DPR on capable devices without removing the lower bound', () => {
  expect(getConfiguratorDpr({ deviceMemory: 8, hardwareConcurrency: 8 })).toEqual([1, 1.75]);
});

test('uses the safe constrained profile when device metrics are unavailable', () => {
  expect(getConfiguratorDpr({})).toEqual([1, 1.5]);
});
