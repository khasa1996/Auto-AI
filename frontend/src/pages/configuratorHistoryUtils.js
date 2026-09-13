export function getHistoryLabel(configuration) {
  const p = configuration?.purchasable || {};
  const parts = [
    ['Variant', p.variant_id],
    ['Paint', p.paint_id],
    ['Wheels', p.wheel_id],
    ['Interior', p.interior_id],
    ['Roof', p.roof_id],
  ].filter(([, value]) => Boolean(value));
  return parts.map(([name, value]) => `${name}: ${value}`).join(' · ') || 'Saved configuration';
}

export function formatHistoryDate(value) {
  if (!value) return 'Updated recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
