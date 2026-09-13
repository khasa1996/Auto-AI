import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { configuratorApi } from '../../services/configuratorApi';
import { buildConfiguratorAIIntent, extractFinanceIntent, getAIConfigurationSelection, getAIInteractionState } from '../../services/configuratorAi';
import { useConfiguratorStore } from '../../state/configuratorStore';
import { formatINR } from '../../lib/api';

export default function ConfiguratorAIAssistant() {
  const variantId = useConfiguratorStore((state) => state.purchasable.variantId);
  const city = useConfiguratorStore((state) => state.city);
  const purchasable = useConfiguratorStore((state) => state.purchasable);
  const [request, setRequest] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState({ loading: false, error: null, explanation: null, price: null, finance: null });

  const applySelection = (selection) => {
    const store = useConfiguratorStore.getState();
    const next = selection.purchasable || {};
    if (next.variant_id !== variantId) return false;
    store.setPaint(next.paint_id || null);
    store.setWheels(next.wheel_id || null);
    store.setInterior(next.interior_id || null);
    store.setRoof(next.roof_id || null);
    [...store.purchasable.accessoryIds].forEach((id) => store.toggleAccessory(id));
    (next.accessory_ids || []).forEach((id) => store.toggleAccessory(id));

    const interaction = getAIInteractionState(selection.interaction);
    if (interaction.cameraPreset && interaction.cameraPreset !== store.interaction.cameraPreset) store.setCameraPreset(interaction.cameraPreset);
    if (interaction.hoodOpen !== store.interaction.hoodOpen) store.toggleHood();
    if (interaction.bootOpen !== store.interaction.bootOpen) store.toggleBoot();
    if (interaction.frunkOpen !== store.interaction.frunkOpen) store.toggleFrunk();
    if (interaction.sunroofOpen !== store.interaction.sunroofOpen) store.toggleSunroof();
    Object.entries(interaction.doors).forEach(([target, value]) => {
      if (value !== store.interaction.doors[target]) store.toggleDoor(target);
    });
    Object.entries(interaction.lighting).forEach(([key, value]) => {
      if (key === 'hazard') {
        if (value !== store.interaction.lighting.hazard) store.toggleHazard();
      } else if (value !== store.interaction.lighting[key]) {
        store.toggleLight(key);
      }
    });
    return true;
  };

  const submit = async (event) => {
    event.preventDefault();
    const rawRequest = request.trim();
    if (!variantId || !rawRequest || state.loading) return;
    setState({ loading: true, error: null, explanation: null, price: null, finance: null });
    try {
      const currentConfiguration = {
        variant_id: purchasable.variantId,
        paint_id: purchasable.paintId,
        wheel_id: purchasable.wheelId,
        interior_id: purchasable.interiorId,
        roof_id: purchasable.roofId,
        accessory_ids: purchasable.accessoryIds,
      };
      const response = await configuratorApi.resolveWithAI(buildConfiguratorAIIntent(variantId, rawRequest, { currentConfiguration, city }));
      const selection = getAIConfigurationSelection(response);
      if (!selection || !applySelection(selection)) {
        setState({ loading: false, error: response.data?.explanation || 'AI could not create a valid configuration.', explanation: null, price: null, finance: null });
        return;
      }
      let finance = null;
      const financeIntent = extractFinanceIntent(rawRequest, selection.price?.estimated_on_road);
      if (financeIntent) {
        try { finance = (await configuratorApi.calculateEMI(financeIntent)).data; } catch { finance = null; }
      }
      setState({ loading: false, error: null, explanation: selection.explanation || 'Configuration applied. Backend validation and city pricing are updating.', price: selection.price, finance });
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setState({ loading: false, error: typeof detail === 'string' ? detail : 'AI configurator is temporarily unavailable.', explanation: null, price: null, finance: null });
    }
  };

  if (!variantId) return null;

  return (
    <div className="flex flex-col items-start gap-2">
      {expanded && (
        <section className="w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-amber-400/20 bg-[#090909]/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2"><Sparkles size={14} className="text-amber-300" /><div><h3 className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">AI configurator</h3><p className="mt-0.5 text-[9px] text-white/35">AI reads your current build and city, then applies only verified options.</p></div></div>
          <form onSubmit={submit} className="space-y-2">
            <textarea value={request} onChange={(event) => setRequest(event.target.value.slice(0, 1800))} rows={3} maxLength={1800} placeholder="e.g. Make it black, keep it under ₹25 lakh and show EMI at 9% for 5 years" className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none placeholder:text-white/20 focus:border-amber-400/40" />
            <button type="submit" disabled={state.loading || !request.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"><Sparkles size={12} /> {state.loading ? 'Building configuration…' : 'Build with AI'}</button>
          </form>
          {state.price && <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"><div className="text-[9px] uppercase tracking-widest text-white/30">AI price estimate</div><div className="mt-1 font-mono text-lg text-amber-300">{formatINR(state.price.estimated_on_road)}</div><div className="mt-1 text-[9px] text-white/30">{state.price.city || city || 'Base pricing'} · final city pricing is recalculated by the configurator</div></div>}
          {state.finance && <div className="mt-2 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-3"><div className="text-[9px] uppercase tracking-widest text-emerald-300/70">Backend EMI estimate</div><div className="mt-1 font-mono text-lg text-emerald-300">{formatINR(Math.round(state.finance.emi || 0))}/month</div><div className="mt-1 text-[9px] text-white/30">{state.finance.annual_rate}% · {Math.round((state.finance.tenure_months || 0) / 12)} years · total interest {formatINR(Math.round(state.finance.total_interest || 0))}</div></div>}
          {state.explanation && <p className="mt-3 text-[10px] leading-4 text-emerald-300">{state.explanation}</p>}
          {state.error && <p className="mt-3 text-[10px] leading-4 text-red-400">{state.error}</p>}
        </section>
      )}
      <button type="button" onClick={() => setExpanded((value) => !value)} className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-black/80 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-amber-300 shadow-xl backdrop-blur-xl transition hover:border-amber-300/60 hover:bg-black" aria-expanded={expanded} aria-label="Toggle AI configurator"><Sparkles size={13} /> {expanded ? 'Close AI' : 'Build with AI'}</button>
    </div>
  );
}
