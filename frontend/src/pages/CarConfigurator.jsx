/**
 * CarConfigurator — main page for the real 3D vehicle configurator.
 *
 * Route: /configurator/:variantId
 *
 * All vehicle, option, asset and pricing data comes from the backend.
 * The page never invents 3D assets, options or prices.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RotateCw, Sparkles } from 'lucide-react';

import ConfiguratorViewer from '../components/configurator/ConfiguratorViewer';
import { useConfiguratorStore } from '../state/configuratorStore';
import { configuratorApi } from '../services/configuratorApi';
import { formatINR } from '../lib/api';

function getErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (detail && typeof detail.message === 'string' && detail.message.trim()) return detail.message;
  if (detail && Array.isArray(detail.errors) && detail.errors.length > 0) {
    return detail.errors.filter((item) => typeof item === 'string').join(' · ');
  }
  return error?.message || fallback;
}

export default function CarConfigurator() {
  const { variantId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [variant, setVariant] = useState(null);
  const [options, setOptions] = useState(null);
  const store = useConfiguratorStore();

  useEffect(() => {
    if (!variantId) return undefined;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setOptions(null);
      store.reset();

      try {
        const availRes = await configuratorApi.getAvailability(variantId);
        const { configurator_status: configuratorStatus, asset_id: assetId } = availRes.data;

        let variantData = null;
        try {
          const varRes = await configuratorApi.getVariant(variantId);
          variantData = varRes.data;
        } catch {
          const { api } = await import('../lib/api');
          const legacyRes = await api.get(`/cars/${variantId}`);
          variantData = legacyRes.data;
        }

        if (cancelled) return;
        setVariant(variantData);
        store.setVariant(variantId);

        if (configuratorStatus === 'AVAILABLE' && assetId) {
          const assetRes = await configuratorApi.getAsset(variantId);
          if (!cancelled && assetRes.data.available) {
            store.setAsset(assetRes.data.asset);
          } else {
            store.setAssetUnavailable(configuratorStatus);
          }
        } else {
          store.setAssetUnavailable(configuratorStatus);
        }

        try {
          const optsRes = await configuratorApi.getOptions(variantId);
          if (!cancelled) setOptions(optsRes.data);
        } catch {
          if (!cancelled) setOptions(null);
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Failed to load vehicle'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [variantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPrice = useCallback(async () => {
    const { purchasable, city } = useConfiguratorStore.getState();
    if (!purchasable.variantId) return;

    useConfiguratorStore.getState().setPriceLoading();
    try {
      const res = await configuratorApi.calculatePrice(
        {
          variant_id: purchasable.variantId,
          paint_id: purchasable.paintId,
          wheel_id: purchasable.wheelId,
          interior_id: purchasable.interiorId,
          roof_id: purchasable.roofId,
          accessory_ids: purchasable.accessoryIds,
        },
        city,
      );
      useConfiguratorStore.getState().setPriceResult(res.data);
    } catch (err) {
      useConfiguratorStore.getState().setPriceError(
        getErrorMessage(err, 'Price calculation failed'),
      );
    }
  }, []);

  useEffect(() => {
    if (store.isInitialized) fetchPrice();
  }, [
    store.isInitialized,
    store.purchasable.paintId,
    store.purchasable.wheelId,
    store.purchasable.interiorId,
    store.purchasable.roofId,
    store.purchasable.accessoryIds.join(','),
    fetchPrice,
  ]);

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
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <Link to="/cars" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/40 hover:text-white">
            <ArrowLeft size={14} /> Exit configurator
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/5 px-4 py-2 text-[10px] uppercase tracking-widest text-amber-300">
            <Sparkles size={12} />
            {store.asset.available ? 'Live 3D configurator' : '3D Coming Soon'}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0a0a0a]">
            <div className="relative p-2">
              <ConfiguratorViewer options={options} />
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
              <div className="text-[10px] uppercase tracking-widest text-amber-400">{variant?.brand || ''}</div>
              <h1 className="mt-1 text-2xl font-light">{variant?.model || variantId}</h1>
              {variant?.variant && <p className="mt-0.5 text-xs text-white/40">{variant.variant}</p>}
              {priceDisplay && <div className="mt-3 font-mono text-3xl text-amber-400">{priceDisplay}</div>}
              {price?.price_is_estimate && (
                <p className="mt-1 text-[10px] text-white/25">Estimated on-road · {store.city || 'ex-showroom base'}</p>
              )}
              {store.price.error && <p className="mt-1 text-[10px] text-red-400">{store.price.error}</p>}
            </div>

            {options?.colors?.length > 0 && <ColorPanel colors={options.colors} />}
            <InteractionPanel />
            <CameraPanel />

            <Link to={`/book/${variantId}`} className="block w-full rounded-xl bg-amber-400 py-3 text-center text-xs font-bold uppercase tracking-widest text-black transition hover:bg-amber-300">
              Book test drive →
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ColorPanel({ colors }) {
  const paintId = useConfiguratorStore((state) => state.purchasable.paintId);
  const setPaint = useConfiguratorStore((state) => state.setPaint);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
      <h3 className="mb-3 text-[10px] uppercase tracking-widest text-white/40">Exterior colour</h3>
      <div className="grid grid-cols-4 gap-2">
        {colors.map((color) => (
          <button
            key={color.color_id}
            onClick={() => setPaint(color.color_id)}
            aria-pressed={paintId === color.color_id}
            aria-label={color.display_name}
            title={`${color.display_name}${color.price_delta > 0 ? ` (+${formatINR(color.price_delta)})` : ''}`}
            className={`rounded-xl border p-1.5 transition ${paintId === color.color_id ? 'border-amber-400' : 'border-white/10 hover:border-white/30'}`}
          >
            <span className="block h-9 w-full rounded-lg border border-white/20" style={{ backgroundColor: color.primary_hex }} />
            <span className="mt-1 block truncate text-center text-[9px] text-white/40">{color.display_name}</span>
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
    { label: 'Hood', active: hoodOpen, action: () => store.toggleHood() },
    { label: 'Boot', active: bootOpen, action: () => store.toggleBoot() },
    { label: 'Headlights', active: lighting.headlights, action: () => store.toggleLight('headlights') },
    { label: 'DRL', active: lighting.drl, action: () => store.toggleLight('drl') },
    { label: 'Hazard', active: lighting.hazard, action: () => store.toggleHazard() },
    { label: 'Door FL', active: doors.frontLeft, action: () => store.toggleDoor('frontLeft') },
    { label: 'Door FR', active: doors.frontRight, action: () => store.toggleDoor('frontRight') },
    { label: 'Door RL', active: doors.rearLeft, action: () => store.toggleDoor('rearLeft') },
    { label: 'Door RR', active: doors.rearRight, action: () => store.toggleDoor('rearRight') },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
      <h3 className="mb-3 text-[10px] uppercase tracking-widest text-white/40">Showroom controls</h3>
      <div className="grid grid-cols-3 gap-2">
        {controls.map(({ label, active, action }) => (
          <button key={label} onClick={action} aria-pressed={active} className={`rounded-lg border py-2 text-[10px] uppercase tracking-wider transition ${active ? 'border-amber-400 bg-amber-400/10 text-amber-300' : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white/70'}`}>
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[9px] text-white/20">Showroom controls do not affect price.</p>
    </div>
  );
}

function CameraPanel() {
  const setCameraPreset = useConfiguratorStore((state) => state.setCameraPreset);
  const cameraPreset = useConfiguratorStore((state) => state.interaction.cameraPreset);
  const setAutoRotate = useConfiguratorStore((state) => state.setAutoRotate);
  const autoRotate = useConfiguratorStore((state) => state.interaction.autoRotate);
  const presets = ['exterior', 'front', 'rear', 'left', 'right', 'top', 'interior', 'cockpit', 'boot', 'wheel'];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[10px] uppercase tracking-widest text-white/40">Camera</h3>
        <button onClick={() => setAutoRotate(!autoRotate)} aria-pressed={autoRotate} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] uppercase tracking-wider transition ${autoRotate ? 'border-amber-400 text-amber-300' : 'border-white/10 text-white/30'}`}>
          <RotateCw size={10} /> Auto
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button key={preset} onClick={() => setCameraPreset(preset)} className={`rounded-lg border px-2.5 py-1 text-[9px] uppercase tracking-wider transition ${cameraPreset === preset ? 'border-amber-400 text-amber-300' : 'border-white/10 text-white/30 hover:border-white/30'}`}>
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
}
