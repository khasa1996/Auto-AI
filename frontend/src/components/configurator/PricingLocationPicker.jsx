import { useEffect, useMemo, useState } from 'react';

import { configuratorApi } from '../../services/configuratorApi';

function normalizeLocation(location) {
  return {
    city: String(location?.city || '').trim(),
    state: String(location?.state || '').trim(),
  };
}

export function groupPricingLocations(locations = []) {
  return locations.reduce((groups, rawLocation) => {
    const location = normalizeLocation(rawLocation);
    if (!location.city || !location.state) return groups;
    const stateGroup = groups.find((group) => group.state === location.state);
    if (stateGroup) stateGroup.cities.push(location);
    else groups.push({ state: location.state, cities: [location] });
    return groups;
  }, []);
}

export default function PricingLocationPicker({ variantId, city, setCity }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadLocations() {
      if (!variantId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await configuratorApi.getPricingLocations(variantId);
        if (!cancelled) setLocations(Array.isArray(response.data?.locations) ? response.data.locations : []);
      } catch (err) {
        if (!cancelled) {
          setLocations([]);
          setError(err?.response?.data?.detail || err?.message || 'Unable to load verified pricing locations');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadLocations();
    return () => { cancelled = true; };
  }, [variantId]);

  const groups = useMemo(() => groupPricingLocations(locations), [locations]);
  const selected = locations.find((location) => location.city.toLowerCase() === String(city || '').trim().toLowerCase());
  const selectedValue = selected ? `${selected.state}::${selected.city}` : '';

  function handleChange(event) {
    const value = event.target.value;
    if (!value) {
      setCity(null);
      return;
    }
    const [, selectedCity] = value.split('::');
    setCity(selectedCity || null);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-[10px] uppercase tracking-widest text-white/40">Pricing location</h3>
        <span className="text-[9px] uppercase tracking-wider text-emerald-300/60">Verified data</span>
      </div>
      <select
        value={selectedValue}
        onChange={handleChange}
        disabled={loading || !groups.length}
        aria-label="Verified pricing location"
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <option value="">{loading ? 'Loading verified locations…' : groups.length ? 'Select state and city' : 'No verified city pricing available'}</option>
        {groups.map((group) => (
          <optgroup key={group.state} label={group.state}>
            {group.cities.map((location) => (
              <option key={`${location.state}::${location.city}`} value={`${location.state}::${location.city}`}>
                {location.city}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {selected && <p className="mt-2 text-[9px] text-white/25">{selected.city}, {selected.state} · verified pricing location</p>}
      {error && <p className="mt-2 text-[9px] text-red-400">{error}</p>}
      {!error && !loading && !groups.length && <p className="mt-2 text-[9px] text-white/25">City-specific pricing will remain unavailable until verified pricing data is published.</p>}
    </div>
  );
}
