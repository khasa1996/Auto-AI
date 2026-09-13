export function getConfiguratorDpr({ deviceMemory, hardwareConcurrency } = {}) {
  if (deviceMemory >= 8 && hardwareConcurrency >= 8) return [1, 1.75];
  if (deviceMemory <= 4 || hardwareConcurrency <= 4) return [1, 1.25];
  return [1, 1.5];
}
