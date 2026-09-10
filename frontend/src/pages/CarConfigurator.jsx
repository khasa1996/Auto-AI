/**
 * CarConfigurator — main page for the 3D vehicle configurator.
 *
 * Route: /configurator/:variantId
 *
 * Flow:
 *  1. Load variant details from /api/v1/variants/:id
 *  2. Check configurator availability from /api/v1/configurator/:id/availability
 *  3. If AVAILABLE: load asset metadata + options
 *  4. Render ConfiguratorViewer (real 3D) or AssetUnavailable (Coming Soon)
 *  5. On purchasable change: validate + fetch price from backend
 *
 * The AI must never invent options or prices — all data comes from the backend.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RotateCw, Sparkles } from 'lucide-react';

import ConfiguratorViewer from '../components/configurator/ConfiguratorViewer';
import { useConfiguratorStore } from '../state/configuratorStore';
import { configuratorApi } from '../services/configuratorApi';
import { formatINR } from '../lib/api';

export default function CarConfigurator() {
  const { variantId } = useParams();
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [variant, setVariant]   = useState(null);
  const [options, setOptions]   = useState(null);

  const store = useConfiguratorStore();

  // ── Load variant + availability + options ──────────────────────────────
  useEffect(() => {
    if (!variantId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      store.reset();

      try {
        // 1. Check availability first
        const availRes = await configuratorApi.getAvailability(variantId);
        const { configurator_status, asset_id } = availRes.data;

        // 2. Try to get variant detail (new normalized collection first, then legacy)
        let variantData = null;
        try {
          const varRes = await configuratorApi.getVariant(variantId);
          variantData = varRes.data;
        } catch {
          // Fallback to legacy /api/cars/:id
          const { api } = await import('../lib/api');
          const legacyRes = await api.get(`/cars/${variantId}`);
          variantData = legacyRes.data;
        }

        if (cancelled) return;
        setVariant(variantData);
        store.setVariant(variantId);

        // 3. Load asset metadata if available
        if (configurator_status === 'AVAILABLE' && asset_id) {
          const assetRes = await configuratorApi.getAsset(variantId);
          if (!cancelled && assetRes.data.available) {
            store.setAsset(assetRes.data.asset);
          } else {
            store.setAssetUnavailable(configurator_status);
          }
        } else {
          store.setAssetUnavailable(configurator_status);
        }

        // 4. Load purchasable options
        try {
          const optsRes = await configuratorApi.getOptions(variantId);
          if (!cancelled) setOptions(optsRes.data);
        } catch {
          // Options may not exist yet for legacy cars — not fatal
          if (!cancelled) setOptions(null);
        }

      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail || err.message || 'Failed to load vehicle');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [variantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch price from backend when purchasable config changes ──────────
  const fetchPrice = useCallback(async () => {
    const { purchasable, city } = store;
    if (!purchasable.variantId) return;

    store.setPriceLoading();
    try {
      const res = await configuratorApi.calculatePrice(
        {
          variant_id:    purchasable.variantId,
          paint_id:      purchasable.paintId,
          wheel_id:      purchasable.wheelId,
          interior_id:   purchasable.interiorId,
          roof_id:       purchasable.roofId,
          accessory_ids: purchasable.accessoryIds,
        },
        city
      );
      store.setPriceResult(res.data);
    } catch (err) {
      store.setPriceError(err?.response?.data?.detail || 'Price calculation failed');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (store.isInitialized) fetchPrice();
  }, [
    store.purchasable.paintId,
    store.purchasable.wheelId,
    store.purchasable.interiorId,
    store.purchasable.roofId,
    store.purchasable.accessoryIds.join(','),
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── UI ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] pt-24 text-white">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center text-xs uppercase tracking-widest text-white/40">
          Loading configurator…
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#050505] pt-24 text-white">
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <Link to="/cars" className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/40 hover:text-white">
            <ArrowLeft size={14} /> Back to cars
          </Link>
        </div>
      </main>
    );
  }

  const price = store.price.data;
  const priceDisplay = price
    ? formatINR(price.estimated_on_road)
    : variant?.price_on_road
      ? formatINR(variant.price_on_road)
      : null;

  return (
    <main className="min-h-screen bg-[#050505] pt-20 text-white">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">

        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/cars"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/40 hover:text-white"
          >
            <ArrowLeft size={14} /> Exit configurator
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/5 px-4 py-2 text-[10px] uppercase tracking-widest text-amber-300">
            <Sparkles size={12} />
            {store.asset.available ? 'Live 3D configurator' : '3D Coming Soon'}
          </div>
        </div>

        {/* Main layout */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

          {/* 3D Viewer */}
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0a0a0a]">
            <div className="relative p-2">
              <ConfiguratorViewer />
            </div>
          </div>

          {/* Controls panel */}
          <aside className="space-y-4">

            {/* Vehicle info */}
            <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
              <div className="text-[10px] uppercase tracking-widest text-amber-400">
                {variant?.brand || ''}
              </div>
              <h1 className="mt-1 text-2xl font-light">
                {variant?.model || variantId}
              </h1>
              {variant?.variant && (
                <p className="mt-0.5 text-xs text-white/40">{variant.variant}</p>
              )}
              {priceDisplay && (
                <div className="mt-3 font-mono text-3xl text-amber-400">
                  {priceDisplay}
                </div>
              )}
              {price?.price_is_estimate && (
                <p className="mt-1 text-[10px] text-white/25">
                  Estimated on-road · {store.city || 'ex-showroom base'}
                </p>
              )}
              {store.price.error && (
                <p className="mt-1 text-[10px] text-red-400">{store.price.error}</p>
              )}
            </div>

            {/* Color options */}
            {options?.colors?.length > 0 && (
              <ColorPanel colors={options.colors} />
            )}

            {/* Interaction controls */}
            <InteractionPanel />

            {/* Camera presets */}
            <CameraPanel />

            {/* Book CTA */}
            <Link
              to={`/book/${variantId}`}
              className="block w-full rounded-xl bg-amber-400 py-3 text-center text-xs font-bold uppercase tracking-widest text-black transition hover:bg-amber-300"
            >
              Book test drive →
            </Link>

          </aside>
        </div>
      </div>
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ColorPanel({ colors }) {
  const paintId = useConfiguratorStore((s) => s.purchasable.paintId);
  const setPaint = useConfiguratorStore((s) => s.setPaint);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
      <h3 className="mb-3 text-[10px] uppercase tracking-widest text-white/40">
        Exterior colour
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {colors.map((c) => (
          <button
            key={c.color_id}
            onClick={() => setPaint(c.color_id)}
            aria-pressed={paintId === c.color_id}
            aria-label={c.display_name}
            title={`${c.display_name}${c.price_delta > 0 ? ` (+${formatINR(c.price_delta)})` : ''}`}
            className={`rounded-xl border p-1.5 transition ${
              paintId === c.color_id ? 'border-amber-400' : 'border-white/10 hover:border-white/30'
            }`}
          >
            <span
              className="block h-9 w-full rounded-lg border border-white/20"
              style={{ backgroundColor: c.primary_hex }}
            />
            <span className="mt-1 block truncate text-center text-[9px] text-white/40">
              {c.display_name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function InteractionPanel() {
  const store = useConfiguratorStore();
  const { doors, hoodOpen, bootOpen, lighting } = store.interaction;

  const controls = [
    { label: 'Hood',       active: hoodOpen,            action: () => store.toggleHood() },
    { label: 'Boot',       active: bootOpen,            action: () => store.toggleBoot() },
    { label: 'Headlights', active: lighting.headlights, action: () => store.toggleLight('headlights') },
    { label: 'DRL',        active: lighting.drl,        action: () => store.toggleLight('drl') },
    { label: 'Hazard',     active: lighting.hazard,     action: () => store.toggleHazard() },
    { label: 'Door FL',    active: doors.frontLeft,     action: () => store.toggleDoor('frontLeft') },
    { label: 'Door FR',    active: doors.frontRight,    action: () => store.toggleDoor('frontRight') },
    { label: 'Door RL',    active: doors.rearLeft,      action: () => store.toggleDoor('rearLeft') },
    { label: 'Door RR',    active: doors.rearRight,     action: () => store.toggleDoor('rearRight') },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
      <h3 className="mb-3 text-[10px] uppercase tracking-widest text-white/40">
        Showroom controls
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {controls.map(({ label, active, action }) => (
          <button
            key={label}
            onClick={action}
            aria-pressed={active}
            className={`rounded-lg border py-2 text-[10px] uppercase tracking-wider transition ${
              active
                ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[9px] text-white/20">
        Showroom controls do not affect price.
      </p>
    </div>
  );
}

function CameraPanel() {
  const setCameraPreset = useConfiguratorStore((s) => s.setCameraPreset);
  const cameraPreset    = useConfiguratorStore((s) => s.interaction.cameraPreset);
  const setAutoRotate   = useConfiguratorStore((s) => s.setAutoRotate);
  const autoRotate      = useConfiguratorStore((s) => s.interaction.autoRotate);

  const presets = ['exterior','front','rear','left','right','top','interior','cockpit','boot','wheel'];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[10px] uppercase tracking-widest text-white/40">Camera</h3>
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          aria-pressed={autoRotate}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] uppercase tracking-wider transition ${
            autoRotate ? 'border-amber-400 text-amber-300' : 'border-white/10 text-white/30'
          }`}
        >
          <RotateCw size={10} /> Auto
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => setCameraPreset(p)}
            className={`rounded-lg border px-2.5 py-1 text-[9px] uppercase tracking-wider transition ${
              cameraPreset === p
                ? 'border-amber-400 text-amber-300'
                : 'border-white/10 text-white/30 hover:border-white/30'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
