import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { configuratorApi } from '../../services/configuratorApi';
import { buildConfiguratorAIIntent, getAIConfigurationSelection } from '../../services/configuratorAi';
import { useConfiguratorStore } from '../../state/configuratorStore';

export default function ConfiguratorAIAssistant() {
  const variantId = useConfiguratorStore((state) => state.purchasable.variantId);
  const [request, setRequest] = useState('');
  const [state, setState] = useState({ loading: false, error: null, explanation: null });

  const applySelection = (selection) => {
    const store = useConfiguratorStore.getState();
    const purchasable = selection.purchasable || {};
    if (purchasable.variant_id !== variantId) return false;
    store.setPaint(purchasable.paint_id || null);
    store.setWheels(purchasable.wheel_id || null);
    store.setInterior(purchasable.interior_id || null);
    store.setRoof(purchasable.roof_id || null);
    const currentAccessories = [...store.purchasable.accessoryIds];
    currentAccessories.forEach((id) => store.toggleAccessory(id));
    (purchasable.accessory_ids || []).forEach((id) => store.toggleAccessory(id));
    const interaction = selection.interaction || {};
    if (interaction.camera_preset) store.setCameraPreset(interaction.camera_preset);
    if (interaction.hood_open !== undefined && interaction.hood_open !== store.interaction.hoodOpen) store.toggleHood();
    if (interaction.boot_open !== undefined && interaction.boot_open !== store.interaction.bootOpen) store.toggleBoot();
    if (interaction.sunroof_open !== undefined && interaction.sunroof_open !== store.interaction.sunroofOpen) store.toggleSunroof();
    if (interaction.doors) {
      Object.entries({
        front_left: 'frontLeft', front_right: 'frontRight', rear_left: 'rearLeft', rear_right: 'rearRight',
      }).forEach(([source, target]) => {
        if (interaction.doors[source] !== undefined && interaction.doors[source] !== store.interaction.doors[target]) store.toggleDoor(target);
      });
    }
    return true;
  };

  const submit = async (event) => {
    event.preventDefault();
    const rawRequest = request.trim();
    if (!variantId || !rawRequest || state.loading) return;
    setState({ loading: true, error: null, explanation: null });
    try {
      const response = await configuratorApi.resolveWithAI(buildConfiguratorAIIntent(variantId, rawRequest));
      const selection = getAIConfigurationSelection(response);
      if (!selection || !applySelection(selection)) {
        setState({ loading: false, error: response.data?.explanation || 'AI could not create a valid configuration.', explanation: null });
        return;
      }
      setState({ loading: false, error: null, explanation: response.data?.explanation || 'Configuration applied. Backend validation and pricing are updating.' });
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setState({ loading: false, error: typeof detail === 'string' ? detail : 'AI configurator is temporarily unavailable.', explanation: null });
    }
  };

  if (!variantId) return null;

  return (
    <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={14} className="text-amber-300" />
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">AI configurator</h3>
          <p className="mt-0.5 text-[9px] text-white/35">Describe your build. Only verified catalog options can be applied.</p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-2">
        <textarea value={request} onChange={(event) => setRequest(event.target.value.slice(0, 2000))} rows={3} maxLength={2000} placeholder="e.g. Make it black with premium interior and sporty wheels" className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none placeholder:text-white/20 focus:border-amber-400/40" />
        <button type="submit" disabled={state.loading || !request.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40">
          <Sparkles size={12} /> {state.loading ? 'Building configuration…' : 'Build with AI'}
        </button>
      </form>
      {state.explanation && <p className="mt-3 text-[10px] leading-4 text-emerald-300">{state.explanation}</p>}
      {state.error && <p className="mt-3 text-[10px] leading-4 text-red-400">{state.error}</p>}
    </section>
  );
}
