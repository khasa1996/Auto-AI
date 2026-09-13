import { groupPricingLocations } from './PricingLocationPicker';

test('groups valid pricing locations by state and drops incomplete records', () => {
  expect(groupPricingLocations([
    { city: 'Gurugram', state: 'Haryana' },
    { city: 'Noida', state: 'Uttar Pradesh' },
    { city: 'Sonipat', state: 'Haryana' },
    { city: '', state: 'Haryana' },
    { city: 'Delhi', state: '' },
  ])).toEqual([
    {
      state: 'Haryana',
      cities: [
        { city: 'Gurugram', state: 'Haryana' },
        { city: 'Sonipat', state: 'Haryana' },
      ],
    },
    {
      state: 'Uttar Pradesh',
      cities: [{ city: 'Noida', state: 'Uttar Pradesh' }],
    },
  ]);
});

test('normalizes whitespace while preserving display values', () => {
  expect(groupPricingLocations([{ city: '  New Delhi  ', state: '  Delhi ' }])).toEqual([
    { state: 'Delhi', cities: [{ city: 'New Delhi', state: 'Delhi' }] },
  ]);
});
