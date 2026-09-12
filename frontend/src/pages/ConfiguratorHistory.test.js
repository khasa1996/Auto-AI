import { formatHistoryDate, getHistoryLabel } from './ConfiguratorHistory';

test('formats saved configuration with semantic field labels', () => {
  expect(getHistoryLabel({
    configuration: {
      purchasable: {
        variant_id: 'v1',
        paint_id: 'red-01',
        wheel_id: 'wheel-02',
        interior_id: 'black',
        roof_id: 'glass',
      },
    },
  })).toBe('Variant: v1 · Paint: red-01 · Wheels: wheel-02 · Interior: black · Roof: glass');
});

test('formats valid history timestamps and safely falls back for invalid values', () => {
  expect(formatHistoryDate('2026-09-12T10:30:00Z')).toContain('12 Sept 2026');
  expect(formatHistoryDate('not-a-date')).toBe('not-a-date');
  expect(formatHistoryDate()).toBe('Updated recently');
});
